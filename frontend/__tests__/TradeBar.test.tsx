import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TradeBar } from '@/components/TradeBar';
import { executeTrade } from '@/lib/api';
import { usePriceContext } from '@/context/PriceContext';

jest.mock('@/lib/api', () => ({
  executeTrade: jest.fn(),
}));

jest.mock('@/context/PriceContext', () => ({
  usePriceContext: jest.fn(),
}));

const mockRefreshPortfolio = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  (usePriceContext as jest.Mock).mockReturnValue({
    refreshPortfolio: mockRefreshPortfolio,
  });
});

describe('TradeBar', () => {
  it('renders ticker input, quantity input, Buy button, and Sell button', () => {
    render(<TradeBar />);
    expect(screen.getByPlaceholderText('Ticker')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Qty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sell/i })).toBeInTheDocument();
  });

  it('calls executeTrade with uppercased ticker, side "buy", and parsed quantity on Buy click', async () => {
    (executeTrade as jest.Mock).mockResolvedValue({
      trade: { id: '1', ticker: 'AAPL', side: 'buy', quantity: 10, price: 190, executed_at: '' },
      cash: 8100,
      total_value: 10000,
    });

    render(<TradeBar />);

    fireEvent.change(screen.getByPlaceholderText('Ticker'), { target: { value: 'aapl' } });
    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(executeTrade).toHaveBeenCalledWith('AAPL', 'buy', 10);
    });
  });

  it('calls executeTrade with side "sell" on Sell click', async () => {
    (executeTrade as jest.Mock).mockResolvedValue({
      trade: { id: '1', ticker: 'AAPL', side: 'sell', quantity: 5, price: 190, executed_at: '' },
      cash: 8100,
      total_value: 10000,
    });

    render(<TradeBar />);

    fireEvent.change(screen.getByPlaceholderText('Ticker'), { target: { value: 'msft' } });
    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /sell/i }));

    await waitFor(() => {
      expect(executeTrade).toHaveBeenCalledWith('MSFT', 'sell', 5);
    });
  });

  it('disables buttons while loading (prevents double-submit)', async () => {
    // Create a promise that never resolves during the test
    let resolvePromise: () => void;
    (executeTrade as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    render(<TradeBar />);

    fireEvent.change(screen.getByPlaceholderText('Ticker'), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /buy/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /sell/i })).toBeDisabled();
    });

    // Cleanup: resolve the pending promise
    resolvePromise!();
  });

  it('shows validation error for empty ticker or invalid quantity', async () => {
    render(<TradeBar />);

    // Leave inputs empty
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(screen.getByTestId('trade-error')).toHaveTextContent('Enter a valid ticker and quantity');
    });
    expect(executeTrade).not.toHaveBeenCalled();
  });

  it('shows validation error for zero quantity', async () => {
    render(<TradeBar />);

    fireEvent.change(screen.getByPlaceholderText('Ticker'), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(screen.getByTestId('trade-error')).toHaveTextContent('Enter a valid ticker and quantity');
    });
    expect(executeTrade).not.toHaveBeenCalled();
  });

  it('displays the detail message from API error inline', async () => {
    (executeTrade as jest.Mock).mockRejectedValue(
      new Error('API /api/portfolio/trade failed 400: {"detail":"Insufficient cash. Need $1900.00, have $100.00"}'),
    );

    render(<TradeBar />);

    fireEvent.change(screen.getByPlaceholderText('Ticker'), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(screen.getByTestId('trade-error')).toHaveTextContent('Insufficient cash. Need $1900.00, have $100.00');
    });
  });

  it('clears inputs after successful trade', async () => {
    (executeTrade as jest.Mock).mockResolvedValue({
      trade: { id: '1', ticker: 'AAPL', side: 'buy', quantity: 10, price: 190, executed_at: '' },
      cash: 8100,
      total_value: 10000,
    });

    render(<TradeBar />);

    const tickerInput = screen.getByPlaceholderText('Ticker') as HTMLInputElement;
    const qtyInput = screen.getByPlaceholderText('Qty') as HTMLInputElement;

    fireEvent.change(tickerInput, { target: { value: 'AAPL' } });
    fireEvent.change(qtyInput, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(tickerInput.value).toBe('');
      expect(qtyInput.value).toBe('');
    });
  });

  it('calls refreshPortfolio after successful trade', async () => {
    (executeTrade as jest.Mock).mockResolvedValue({
      trade: { id: '1', ticker: 'AAPL', side: 'buy', quantity: 10, price: 190, executed_at: '' },
      cash: 8100,
      total_value: 10000,
    });

    render(<TradeBar />);

    fireEvent.change(screen.getByPlaceholderText('Ticker'), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(mockRefreshPortfolio).toHaveBeenCalled();
    });
  });

  it('clears error when starting a new trade attempt', async () => {
    // First attempt: error
    (executeTrade as jest.Mock).mockRejectedValueOnce(
      new Error('API /api/portfolio/trade failed 400: {"detail":"Insufficient cash"}'),
    );

    render(<TradeBar />);

    fireEvent.change(screen.getByPlaceholderText('Ticker'), { target: { value: 'AAPL' } });
    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(screen.getByTestId('trade-error')).toBeInTheDocument();
    });

    // Second attempt: success
    (executeTrade as jest.Mock).mockResolvedValueOnce({
      trade: { id: '1', ticker: 'AAPL', side: 'buy', quantity: 10, price: 190, executed_at: '' },
      cash: 8100,
      total_value: 10000,
    });

    fireEvent.change(screen.getByPlaceholderText('Ticker'), { target: { value: 'MSFT' } });
    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('trade-error')).not.toBeInTheDocument();
    });
  });
});
