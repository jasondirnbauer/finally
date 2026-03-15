import { render, screen } from '@testing-library/react';
import { PriceChart } from '@/components/PriceChart';
import { createChart, __mockChart, __mockSeries } from 'lightweight-charts';

// Mock ResizeObserver (not available in jsdom)
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
  unobserve: jest.fn(),
}));

describe('PriceChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows placeholder message when no ticker is selected', () => {
    render(<PriceChart ticker={null} data={[]} />);
    expect(screen.getByText(/select a ticker to view chart/i)).toBeInTheDocument();
  });

  it('renders container div with data-testid="price-chart" when ticker provided', () => {
    render(<PriceChart ticker="AAPL" data={[100, 102, 101]} />);
    expect(screen.getByTestId('price-chart')).toBeInTheDocument();
  });

  it('calls createChart when mounted with ticker and data', () => {
    render(<PriceChart ticker="AAPL" data={[100, 102, 101, 105]} />);
    expect(createChart).toHaveBeenCalled();
  });

  it('displays ticker name as overlay text', () => {
    render(<PriceChart ticker="AAPL" data={[100, 102, 101]} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('calls chart.remove on unmount', () => {
    const { unmount } = render(<PriceChart ticker="AAPL" data={[100, 102, 101]} />);
    unmount();
    expect((__mockChart as any).remove).toHaveBeenCalled();
  });

  it('sets up ResizeObserver for container', () => {
    render(<PriceChart ticker="AAPL" data={[100, 102, 101]} />);
    expect(mockObserve).toHaveBeenCalled();
  });

  it('disconnects ResizeObserver on unmount', () => {
    const { unmount } = render(<PriceChart ticker="AAPL" data={[100, 102, 101]} />);
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('calls series.setData with mapped chart data', () => {
    render(<PriceChart ticker="AAPL" data={[100, 102, 101]} />);
    expect((__mockSeries as any).setData).toHaveBeenCalled();
    const callArgs = (__mockSeries as any).setData.mock.calls[0][0];
    expect(callArgs).toHaveLength(3);
    expect(callArgs[0]).toEqual({ time: 0, value: 100 });
    expect(callArgs[1]).toEqual({ time: 1, value: 102 });
    expect(callArgs[2]).toEqual({ time: 2, value: 101 });
  });

  it('shows placeholder when ticker provided but data is empty', () => {
    render(<PriceChart ticker="AAPL" data={[]} />);
    expect(screen.getByText(/select a ticker to view chart/i)).toBeInTheDocument();
  });
});
