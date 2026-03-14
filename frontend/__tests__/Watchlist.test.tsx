import { render, screen, fireEvent } from '@testing-library/react';
import { Watchlist } from '@/components/Watchlist';

jest.mock('@/context/PriceContext', () => ({
  usePriceContext: jest.fn(),
}));
import { usePriceContext } from '@/context/PriceContext';
const mockCtx = usePriceContext as jest.MockedFunction<typeof usePriceContext>;

const baseCtx = {
  prices: {
    AAPL: { ticker: 'AAPL', price: 190.0, previous_price: 189.5, timestamp: 't1', change: 0.5, direction: 'up' as const },
    GOOGL: { ticker: 'GOOGL', price: 175.0, previous_price: 176.0, timestamp: 't2', change: -1.0, direction: 'down' as const },
  },
  priceHistory: {},
  status: 'connected' as const,
  portfolio: null,
  watchlist: [
    { ticker: 'AAPL', price: 190.0, added_at: '2024-01-01' },
    { ticker: 'GOOGL', price: 175.0, added_at: '2024-01-01' },
  ],
  selectedTicker: null,
  setSelectedTicker: jest.fn(),
  refreshPortfolio: jest.fn(),
  refreshWatchlist: jest.fn(),
};

describe('Watchlist', () => {
  beforeEach(() => mockCtx.mockReturnValue({ ...baseCtx, setSelectedTicker: jest.fn() }));

  it('renders all watchlist tickers', () => {
    render(<Watchlist />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('GOOGL')).toBeInTheDocument();
  });

  it('calls setSelectedTicker when row clicked', () => {
    const setSelectedTicker = jest.fn();
    mockCtx.mockReturnValue({ ...baseCtx, setSelectedTicker });
    render(<Watchlist />);
    fireEvent.click(screen.getByText('AAPL'));
    expect(setSelectedTicker).toHaveBeenCalledWith('AAPL');
  });

  it('shows selected ticker with highlight styling', () => {
    mockCtx.mockReturnValue({ ...baseCtx, selectedTicker: 'AAPL', setSelectedTicker: jest.fn() });
    const { container } = render(<Watchlist />);
    // Row with AAPL should have selected class
    const aaplRow = screen.getByText('AAPL').closest('[data-ticker]');
    expect(aaplRow).toHaveAttribute('data-selected', 'true');
  });
});
