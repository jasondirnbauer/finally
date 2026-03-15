import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/Header';
import type { ConnectionStatus, PortfolioSummary } from '@/lib/types';

// Mock the context hook
jest.mock('@/context/PriceContext', () => ({
  usePriceContext: jest.fn(),
}));
import { usePriceContext } from '@/context/PriceContext';
const mockUsePriceContext = usePriceContext as jest.MockedFunction<typeof usePriceContext>;

function makeCtx(status: ConnectionStatus, portfolio: PortfolioSummary | null) {
  return {
    status,
    portfolio,
    prices: {},
    priceHistory: {},
    watchlist: [],
    selectedTicker: null,
    setSelectedTicker: jest.fn(),
    refreshPortfolio: jest.fn(),
    refreshWatchlist: jest.fn(),
  };
}

describe('Header', () => {
  it('renders FinAlly branding', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('connected', null));
    render(<Header />);
    expect(screen.getByText(/FinAlly/i)).toBeInTheDocument();
  });

  it('shows green dot when connected', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('connected', null));
    const { container } = render(<Header />);
    const dot = container.querySelector('[data-testid="status-dot"]');
    expect(dot).toHaveClass('bg-green-500');
  });

  it('shows yellow dot when reconnecting', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('reconnecting', null));
    const { container } = render(<Header />);
    const dot = container.querySelector('[data-testid="status-dot"]');
    expect(dot).toHaveClass('bg-yellow-500');
  });

  it('shows red dot when disconnected', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('disconnected', null));
    const { container } = render(<Header />);
    const dot = container.querySelector('[data-testid="status-dot"]');
    expect(dot).toHaveClass('bg-red-500');
  });

  it('shows placeholder when portfolio is null', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('connected', null));
    render(<Header />);
    // Should show dashes or loading text, not a dollar amount
    expect(screen.queryByText(/\$10,000/)).not.toBeInTheDocument();
  });

  it('shows portfolio value when portfolio loaded', () => {
    const portfolio: PortfolioSummary = {
      cash: 5000.0,
      total_value: 15000.0,
      total_market_value: 10000.0,
      unrealized_pnl: 0,
      positions: [],
    };
    mockUsePriceContext.mockReturnValue(makeCtx('connected', portfolio));
    render(<Header />);
    expect(screen.getByText(/\$15,000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$5,000\.00/)).toBeInTheDocument();
  });

  it('does not render chat toggle button when onChatToggle is not provided', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('connected', null));
    render(<Header />);
    expect(screen.queryByText('AI Chat')).not.toBeInTheDocument();
  });

  it('renders chat toggle button when onChatToggle is provided', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('connected', null));
    render(<Header onChatToggle={jest.fn()} chatOpen={false} />);
    expect(screen.getByText('AI Chat')).toBeInTheDocument();
  });

  it('applies active styling when chatOpen is true', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('connected', null));
    render(<Header onChatToggle={jest.fn()} chatOpen={true} />);
    const btn = screen.getByText('AI Chat');
    expect(btn).toHaveClass('bg-terminal-purple/20');
  });

  it('applies inactive styling when chatOpen is false', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('connected', null));
    render(<Header onChatToggle={jest.fn()} chatOpen={false} />);
    const btn = screen.getByText('AI Chat');
    expect(btn).toHaveClass('border-terminal-border');
  });

  it('fires onChatToggle callback when toggle button is clicked', () => {
    mockUsePriceContext.mockReturnValue(makeCtx('connected', null));
    const onChatToggle = jest.fn();
    render(<Header onChatToggle={onChatToggle} chatOpen={false} />);
    fireEvent.click(screen.getByText('AI Chat'));
    expect(onChatToggle).toHaveBeenCalledTimes(1);
  });
});
