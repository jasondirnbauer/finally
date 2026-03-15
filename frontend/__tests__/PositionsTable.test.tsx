import { render, screen } from '@testing-library/react';
import { PositionsTable } from '@/components/PositionsTable';
import { usePriceContext } from '@/context/PriceContext';

jest.mock('@/context/PriceContext', () => ({
  usePriceContext: jest.fn(),
}));

function mockContext(overrides: Record<string, unknown> = {}) {
  (usePriceContext as jest.Mock).mockReturnValue({
    portfolio: null,
    ...overrides,
  });
}

describe('PositionsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table headers: Ticker, Qty, Avg Cost, Price, P&L, %', () => {
    mockContext({
      portfolio: {
        cash: 8000,
        total_value: 10000,
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
        ],
      },
    });

    render(<PositionsTable />);

    expect(screen.getByText('Ticker')).toBeInTheDocument();
    expect(screen.getByText('Qty')).toBeInTheDocument();
    expect(screen.getByText('Avg Cost')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('P&L')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('renders a row for each position with formatted values', () => {
    mockContext({
      portfolio: {
        cash: 8000,
        total_value: 10000,
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
        ],
      },
    });

    render(<PositionsTable />);

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    // formatPrice(185) = "185.00" and formatPrice(190) = "190.00"
    expect(screen.getByText('185.00')).toBeInTheDocument();
    expect(screen.getByText('190.00')).toBeInTheDocument();
  });

  it('colors P&L text green for positive values', () => {
    mockContext({
      portfolio: {
        cash: 8000,
        total_value: 10000,
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
        ],
      },
    });

    render(<PositionsTable />);

    // formatCurrency(50) = "$50.00"
    const pnlCell = screen.getByText('$50.00');
    expect(pnlCell).toHaveClass('text-green-400');

    // formatChangePct(2.7) = "+2.70%"
    const pctCell = screen.getByText('+2.70%');
    expect(pctCell).toHaveClass('text-green-400');
  });

  it('colors P&L text red for negative values', () => {
    mockContext({
      portfolio: {
        cash: 8000,
        total_value: 9800,
        total_market_value: 1800,
        unrealized_pnl: -200,
        positions: [
          {
            ticker: 'GOOGL',
            quantity: 5,
            avg_cost: 180,
            current_price: 170,
            market_value: 850,
            unrealized_pnl: -50,
            pnl_percent: -5.56,
          },
        ],
      },
    });

    render(<PositionsTable />);

    const pnlCell = screen.getByText('-$50.00');
    expect(pnlCell).toHaveClass('text-red-400');

    const pctCell = screen.getByText('-5.56%');
    expect(pctCell).toHaveClass('text-red-400');
  });

  it('shows "No positions" when positions array is empty', () => {
    mockContext({
      portfolio: {
        cash: 10000,
        total_value: 10000,
        total_market_value: 0,
        unrealized_pnl: 0,
        positions: [],
      },
    });

    render(<PositionsTable />);

    expect(screen.getByText('No positions')).toBeInTheDocument();
  });

  it('shows "No positions" when portfolio is null', () => {
    mockContext({ portfolio: null });

    render(<PositionsTable />);

    expect(screen.getByText('No positions')).toBeInTheDocument();
  });

  it('shows dash for null current_price', () => {
    mockContext({
      portfolio: {
        cash: 8000,
        total_value: 10000,
        total_market_value: 2000,
        unrealized_pnl: 0,
        positions: [
          {
            ticker: 'AAPL',
            quantity: 10,
            avg_cost: 185,
            current_price: null,
            market_value: 0,
            unrealized_pnl: null,
            pnl_percent: null,
          },
        ],
      },
    });

    render(<PositionsTable />);

    // Should show a dash for missing price
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
