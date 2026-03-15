import { render, screen } from '@testing-library/react';
import { ChartPanel } from '@/components/ChartPanel';
import { usePriceContext } from '@/context/PriceContext';

jest.mock('@/context/PriceContext', () => ({
  usePriceContext: jest.fn(),
}));

jest.mock('@/components/PriceChart', () => ({
  PriceChart: (props: { ticker: string | null; data: number[] }) => (
    <div
      data-testid="price-chart"
      data-ticker={props.ticker ?? 'null'}
      data-points={props.data?.length ?? 0}
    />
  ),
}));

jest.mock('@/components/TradeBar', () => ({
  TradeBar: () => <div data-testid="trade-bar" />,
}));

function mockContext(overrides: Record<string, unknown> = {}) {
  (usePriceContext as jest.Mock).mockReturnValue({
    selectedTicker: null,
    priceHistory: {},
    prices: {},
    status: 'connected',
    portfolio: null,
    watchlist: [],
    setSelectedTicker: jest.fn(),
    refreshPortfolio: jest.fn(),
    refreshWatchlist: jest.fn(),
    ...overrides,
  });
}

describe('ChartPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes selectedTicker to PriceChart as ticker prop', () => {
    mockContext({
      selectedTicker: 'AAPL',
      priceHistory: { AAPL: [100, 101, 102] },
    });

    render(<ChartPanel />);

    const chart = screen.getByTestId('price-chart');
    expect(chart).toHaveAttribute('data-ticker', 'AAPL');
  });

  it('passes priceHistory[selectedTicker] as data to PriceChart', () => {
    mockContext({
      selectedTicker: 'AAPL',
      priceHistory: { AAPL: [100, 101, 102] },
    });

    render(<ChartPanel />);

    const chart = screen.getByTestId('price-chart');
    expect(chart).toHaveAttribute('data-points', '3');
  });

  it('passes null ticker to PriceChart when no ticker is selected', () => {
    mockContext({ selectedTicker: null });

    render(<ChartPanel />);

    const chart = screen.getByTestId('price-chart');
    expect(chart).toHaveAttribute('data-ticker', 'null');
    expect(chart).toHaveAttribute('data-points', '0');
  });

  it('renders TradeBar', () => {
    mockContext();

    render(<ChartPanel />);

    expect(screen.getByTestId('trade-bar')).toBeInTheDocument();
  });

  it('passes empty array when selectedTicker has no priceHistory', () => {
    mockContext({
      selectedTicker: 'TSLA',
      priceHistory: { AAPL: [100, 101] },
    });

    render(<ChartPanel />);

    const chart = screen.getByTestId('price-chart');
    expect(chart).toHaveAttribute('data-ticker', 'TSLA');
    expect(chart).toHaveAttribute('data-points', '0');
  });
});
