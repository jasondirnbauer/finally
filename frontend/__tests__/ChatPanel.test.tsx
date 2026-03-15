import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatPanel } from '@/components/ChatPanel';
import { sendChatMessage, fetchChatHistory } from '@/lib/api';
import { usePriceContext } from '@/context/PriceContext';

jest.mock('@/lib/api', () => ({
  sendChatMessage: jest.fn(),
  fetchChatHistory: jest.fn(),
}));

jest.mock('@/context/PriceContext', () => ({
  usePriceContext: jest.fn(),
}));

const mockRefreshPortfolio = jest.fn().mockResolvedValue(undefined);
const mockRefreshWatchlist = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  (usePriceContext as jest.Mock).mockReturnValue({
    refreshPortfolio: mockRefreshPortfolio,
    refreshWatchlist: mockRefreshWatchlist,
  });
  (fetchChatHistory as jest.Mock).mockResolvedValue([]);
});

describe('ChatPanel', () => {
  it('renders and loads history on mount', async () => {
    (fetchChatHistory as jest.Mock).mockResolvedValue([
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        actions: null,
        created_at: '2026-03-15T12:00:00Z',
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Hi there!',
        actions: null,
        created_at: '2026-03-15T12:00:01Z',
      },
    ]);

    render(<ChatPanel onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    expect(fetchChatHistory).toHaveBeenCalledTimes(1);
  });

  it('parses JSON string actions from history correctly', async () => {
    const actionsObj = {
      trades: [{ ticker: 'AAPL', side: 'buy', quantity: 10, price: 190, status: 'executed' }],
    };

    (fetchChatHistory as jest.Mock).mockResolvedValue([
      {
        id: '1',
        role: 'assistant' as const,
        content: 'I bought AAPL for you',
        actions: actionsObj,
        created_at: '2026-03-15T12:00:00Z',
      },
    ]);

    render(<ChatPanel onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('I bought AAPL for you')).toBeInTheDocument();
      expect(screen.getByTestId('trade-card')).toBeInTheDocument();
    });
  });

  it('shows loading indicator while API call is in flight', async () => {
    let resolveChat: (value: unknown) => void;
    (sendChatMessage as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveChat = resolve;
      }),
    );

    render(<ChatPanel onClose={jest.fn()} />);

    await waitFor(() => {
      expect(fetchChatHistory).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Ask FinAlly anything...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
    });

    // Cleanup: resolve the pending promise
    await act(async () => {
      resolveChat!({
        message: 'Response',
        trades: [],
        watchlist_changes: [],
      });
    });
  });

  it('sends message and displays assistant response', async () => {
    (sendChatMessage as jest.Mock).mockResolvedValue({
      message: 'I can help with that!',
      trades: [],
      watchlist_changes: [],
    });

    render(<ChatPanel onClose={jest.fn()} />);

    await waitFor(() => {
      expect(fetchChatHistory).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Ask FinAlly anything...');
    fireEvent.change(input, { target: { value: 'Help me' } });
    fireEvent.click(screen.getByText('Send'));

    // Optimistic user message appears immediately
    await waitFor(() => {
      expect(screen.getByText('Help me')).toBeInTheDocument();
    });

    // Assistant response appears
    await waitFor(() => {
      expect(screen.getByText('I can help with that!')).toBeInTheDocument();
    });
  });

  it('calls refreshPortfolio when response has trades', async () => {
    (sendChatMessage as jest.Mock).mockResolvedValue({
      message: 'Bought AAPL for you',
      trades: [{ ticker: 'AAPL', side: 'buy', quantity: 10, price: 190, status: 'executed' }],
      watchlist_changes: [],
    });

    render(<ChatPanel onClose={jest.fn()} />);

    await waitFor(() => {
      expect(fetchChatHistory).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Ask FinAlly anything...');
    fireEvent.change(input, { target: { value: 'Buy AAPL' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(mockRefreshPortfolio).toHaveBeenCalled();
    });
  });

  it('calls refreshWatchlist when response has watchlist_changes', async () => {
    (sendChatMessage as jest.Mock).mockResolvedValue({
      message: 'Added PYPL to watchlist',
      trades: [],
      watchlist_changes: [{ ticker: 'PYPL', action: 'add', status: 'done' }],
    });

    render(<ChatPanel onClose={jest.fn()} />);

    await waitFor(() => {
      expect(fetchChatHistory).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Ask FinAlly anything...');
    fireEvent.change(input, { target: { value: 'Add PYPL' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(mockRefreshWatchlist).toHaveBeenCalled();
    });
  });

  it('disables input while loading', async () => {
    let resolveChat: (value: unknown) => void;
    (sendChatMessage as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveChat = resolve;
      }),
    );

    render(<ChatPanel onClose={jest.fn()} />);

    await waitFor(() => {
      expect(fetchChatHistory).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Ask FinAlly anything...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ask FinAlly anything...')).toBeDisabled();
    });

    // Cleanup
    await act(async () => {
      resolveChat!({
        message: 'Done',
        trades: [],
        watchlist_changes: [],
      });
    });
  });

  it('shows error message on API failure', async () => {
    (sendChatMessage as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ChatPanel onClose={jest.fn()} />);

    await waitFor(() => {
      expect(fetchChatHistory).toHaveBeenCalled();
    });

    const input = screen.getByPlaceholderText('Ask FinAlly anything...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(
        screen.getByText('Sorry, something went wrong. Please try again.'),
      ).toBeInTheDocument();
    });
  });

  it('renders close button that calls onClose', async () => {
    const onClose = jest.fn();
    render(<ChatPanel onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Close chat');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
