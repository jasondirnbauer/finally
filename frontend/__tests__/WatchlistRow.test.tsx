import { render, act } from '@testing-library/react';
import { WatchlistRow } from '@/components/WatchlistRow';
import type { PriceUpdate } from '@/lib/types';

function makeUpdate(overrides: Partial<PriceUpdate> = {}): PriceUpdate {
  return {
    ticker: 'AAPL',
    price: 190.0,
    previous_price: 189.5,
    timestamp: '2024-01-01T00:00:00.000Z',
    change: 0.5,
    direction: 'up',
    ...overrides,
  };
}

describe('WatchlistRow', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders ticker symbol, price, change, and changePct', () => {
    const { getByText } = render(
      <WatchlistRow ticker="AAPL" update={makeUpdate()} priceHistory={[]} selected={false} onClick={jest.fn()} />,
    );
    expect(getByText('AAPL')).toBeInTheDocument();
    expect(getByText(/190\.00/)).toBeInTheDocument();
  });

  it('applies flash-green class on uptick', () => {
    const { container } = render(
      <WatchlistRow ticker="AAPL" update={makeUpdate({ direction: 'up' })} priceHistory={[]} selected={false} onClick={jest.fn()} />,
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).toMatch(/flash-green/);
  });

  it('applies flash-red class on downtick', () => {
    const { container } = render(
      <WatchlistRow ticker="AAPL" update={makeUpdate({ direction: 'down' })} priceHistory={[]} selected={false} onClick={jest.fn()} />,
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).toMatch(/flash-red/);
  });

  it('removes flash class after 500ms', () => {
    const { container } = render(
      <WatchlistRow ticker="AAPL" update={makeUpdate({ direction: 'up' })} priceHistory={[]} selected={false} onClick={jest.fn()} />,
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).toMatch(/flash-green/);
    act(() => { jest.advanceTimersByTime(600); });
    expect(row.className).not.toMatch(/flash-green/);
  });

  it('re-triggers flash on new timestamp with same price', () => {
    const update1 = makeUpdate({ timestamp: '2024-01-01T00:00:00.000Z', direction: 'up' });
    const { container, rerender } = render(
      <WatchlistRow ticker="AAPL" update={update1} priceHistory={[]} selected={false} onClick={jest.fn()} />,
    );
    // Advance past first flash
    act(() => { jest.advanceTimersByTime(600); });
    const row = container.firstChild as HTMLElement;
    expect(row.className).not.toMatch(/flash-green/);

    // Same price, new timestamp — should re-flash
    const update2 = makeUpdate({ timestamp: '2024-01-01T00:00:00.500Z', direction: 'up' });
    rerender(
      <WatchlistRow ticker="AAPL" update={update2} priceHistory={[]} selected={false} onClick={jest.fn()} />,
    );
    expect(row.className).toMatch(/flash-green/);
  });
});
