import { render, screen } from '@testing-library/react';
import { PortfolioHeatmap } from '@/components/PortfolioHeatmap';
import { usePriceContext } from '@/context/PriceContext';

jest.mock('@/context/PriceContext', () => ({
  usePriceContext: jest.fn(),
}));

// Mock recharts Treemap and ResponsiveContainer as simple divs
jest.mock('recharts', () => ({
  Treemap: (props: { data?: unknown[] }) => (
    <div data-testid="treemap" data-count={props.data?.length ?? 0}>
      treemap-mock
    </div>
  ),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

function mockContext(overrides: Record<string, unknown> = {}) {
  (usePriceContext as jest.Mock).mockReturnValue({
    portfolio: null,
    ...overrides,
  });
}

describe('PortfolioHeatmap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a Treemap when positions exist', () => {
    mockContext({
      portfolio: {
        cash: 8000,
        total_value: 10000,
        total_market_value: 2750,
        unrealized_pnl: 50,
        positions: [
          {
            ticker: 'AAPL',
            quantity: 10,
            avg_cost: 185,
            current_price: 190,
            market_value: 1900,
            unrealized_pnl: 50,
            pnl_percent: 2.7,
          },
          {
            ticker: 'GOOGL',
            quantity: 5,
            avg_cost: 170,
            current_price: 170,
            market_value: 850,
            unrealized_pnl: 0,
            pnl_percent: 0,
          },
        ],
      },
    });

    render(<PortfolioHeatmap />);

    expect(screen.getByTestId('treemap')).toBeInTheDocument();
  });

  it('shows "No positions to display" when positions array is empty', () => {
    mockContext({
      portfolio: {
        cash: 10000,
        total_value: 10000,
        total_market_value: 0,
        unrealized_pnl: 0,
        positions: [],
      },
    });

    render(<PortfolioHeatmap />);

    expect(screen.getByText('No positions to display')).toBeInTheDocument();
    expect(screen.queryByTestId('treemap')).not.toBeInTheDocument();
  });

  it('shows "No positions to display" when portfolio is null', () => {
    mockContext({ portfolio: null });

    render(<PortfolioHeatmap />);

    expect(screen.getByText('No positions to display')).toBeInTheDocument();
  });

  it('transforms positions into treemap data with correct item count', () => {
    mockContext({
      portfolio: {
        cash: 5000,
        total_value: 10000,
        total_market_value: 5000,
        unrealized_pnl: 100,
        positions: [
          {
            ticker: 'AAPL',
            quantity: 10,
            avg_cost: 185,
            current_price: 190,
            market_value: 1900,
            unrealized_pnl: 50,
            pnl_percent: 2.7,
          },
          {
            ticker: 'GOOGL',
            quantity: 5,
            avg_cost: 170,
            current_price: 180,
            market_value: 900,
            unrealized_pnl: 50,
            pnl_percent: 5.88,
          },
          {
            ticker: 'TSLA',
            quantity: 8,
            avg_cost: 200,
            current_price: 195,
            market_value: 1560,
            unrealized_pnl: -40,
            pnl_percent: -2.5,
          },
        ],
      },
    });

    render(<PortfolioHeatmap />);

    const treemap = screen.getByTestId('treemap');
    expect(treemap).toHaveAttribute('data-count', '3');
  });

  it('filters out positions with zero market_value', () => {
    mockContext({
      portfolio: {
        cash: 10000,
        total_value: 12000,
        total_market_value: 2000,
        unrealized_pnl: 50,
        positions: [
          {
            ticker: 'AAPL',
            quantity: 10,
            avg_cost: 185,
            current_price: 190,
            market_value: 1900,
            unrealized_pnl: 50,
            pnl_percent: 2.7,
          },
          {
            ticker: 'GOOGL',
            quantity: 0,
            avg_cost: 170,
            current_price: null,
            market_value: 0,
            unrealized_pnl: null,
            pnl_percent: null,
          },
        ],
      },
    });

    render(<PortfolioHeatmap />);

    const treemap = screen.getByTestId('treemap');
    // Only AAPL should be in the data (GOOGL has market_value 0)
    expect(treemap).toHaveAttribute('data-count', '1');
  });
});
