import { render, screen, act } from '@testing-library/react';
import { PnlChart } from '@/components/PnlChart';
import { fetchPortfolioHistory } from '@/lib/api';
import { usePriceContext } from '@/context/PriceContext';

jest.mock('@/lib/api', () => ({
  fetchPortfolioHistory: jest.fn(),
}));

jest.mock('@/context/PriceContext', () => ({
  usePriceContext: jest.fn(),
}));

jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

function mockContext(overrides: Record<string, unknown> = {}) {
  (usePriceContext as jest.Mock).mockReturnValue({
    portfolio: { total_value: 10000 },
    ...overrides,
  });
}

describe('PnlChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockContext();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls fetchPortfolioHistory on mount', async () => {
    (fetchPortfolioHistory as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(<PnlChart />);
    });

    expect(fetchPortfolioHistory).toHaveBeenCalledTimes(1);
  });

  it('renders LineChart when snapshots are available', async () => {
    (fetchPortfolioHistory as jest.Mock).mockResolvedValue([
      { id: '1', total_value: 10000, recorded_at: '2026-03-14T12:00:00Z' },
      { id: '2', total_value: 10050, recorded_at: '2026-03-14T12:00:30Z' },
    ]);

    await act(async () => {
      render(<PnlChart />);
    });

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows "No data yet" when snapshots array is empty', async () => {
    (fetchPortfolioHistory as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(<PnlChart />);
    });

    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('does NOT re-fetch when portfolio.total_value changes (no excessive polling)', async () => {
    (fetchPortfolioHistory as jest.Mock).mockResolvedValue([
      { id: '1', total_value: 10000, recorded_at: '2026-03-14T12:00:00Z' },
    ]);

    const { rerender } = await act(async () => {
      return render(<PnlChart />);
    });

    expect(fetchPortfolioHistory).toHaveBeenCalledTimes(1);

    // Simulate portfolio value change via context
    mockContext({ portfolio: { total_value: 10500 } });

    await act(async () => {
      rerender(<PnlChart />);
    });

    // Should still only be 1 call (mount), not triggered by value change
    expect(fetchPortfolioHistory).toHaveBeenCalledTimes(1);
  });

  it('re-fetches on the 30-second interval', async () => {
    (fetchPortfolioHistory as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(<PnlChart />);
    });

    expect(fetchPortfolioHistory).toHaveBeenCalledTimes(1);

    // Advance by 30 seconds
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    expect(fetchPortfolioHistory).toHaveBeenCalledTimes(2);
  });
});
