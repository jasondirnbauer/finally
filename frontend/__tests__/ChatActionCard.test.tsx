import { render, screen } from '@testing-library/react';
import { ChatActionCard } from '@/components/ChatActionCard';
import type { ChatActions } from '@/lib/types';

describe('ChatActionCard', () => {
  it('renders a trade card showing "Bought 10 AAPL at $190.50" for a successful buy trade (green left border)', () => {
    const actions: ChatActions = {
      trades: [{ ticker: 'AAPL', side: 'buy', quantity: 10, price: 190.5, status: 'executed' }],
    };
    render(<ChatActionCard actions={actions} />);
    const card = screen.getByTestId('trade-card');
    expect(card).toHaveTextContent('Bought 10 AAPL at $190.50');
    expect(card.className).toMatch(/border-green-500/);
  });

  it('renders a trade card showing "Sold 5 MSFT at $420.00" for a successful sell trade (red left border)', () => {
    const actions: ChatActions = {
      trades: [{ ticker: 'MSFT', side: 'sell', quantity: 5, price: 420.0, status: 'executed' }],
    };
    render(<ChatActionCard actions={actions} />);
    const card = screen.getByTestId('trade-card');
    expect(card).toHaveTextContent('Sold 5 MSFT at $420.00');
    expect(card.className).toMatch(/border-red-500/);
  });

  it('renders a trade card showing "Failed: Insufficient cash..." for a failed trade (red left border, error text)', () => {
    const actions: ChatActions = {
      trades: [{ ticker: 'AAPL', side: 'buy', quantity: 100, error: 'Insufficient cash' }],
    };
    render(<ChatActionCard actions={actions} />);
    const card = screen.getByTestId('trade-card');
    expect(card).toHaveTextContent('Failed: Insufficient cash');
    expect(card.className).toMatch(/border-red-500/);
  });

  it('renders a watchlist card showing "Added PYPL to watchlist" for add action (blue left border)', () => {
    const actions: ChatActions = {
      watchlist_changes: [{ ticker: 'PYPL', action: 'add', status: 'done' }],
    };
    render(<ChatActionCard actions={actions} />);
    const card = screen.getByTestId('watchlist-card');
    expect(card).toHaveTextContent('Added PYPL to watchlist');
    expect(card.className).toMatch(/border-blue-500/);
  });

  it('renders a watchlist card showing "Removed TSLA from watchlist" for remove action (blue left border)', () => {
    const actions: ChatActions = {
      watchlist_changes: [{ ticker: 'TSLA', action: 'remove', status: 'done' }],
    };
    render(<ChatActionCard actions={actions} />);
    const card = screen.getByTestId('watchlist-card');
    expect(card).toHaveTextContent('Removed TSLA from watchlist');
    expect(card.className).toMatch(/border-blue-500/);
  });

  it('renders a watchlist card showing "Failed: reason" for a failed watchlist change (red left border)', () => {
    const actions: ChatActions = {
      watchlist_changes: [{ ticker: 'PYPL', action: 'add', error: 'Already in watchlist' }],
    };
    render(<ChatActionCard actions={actions} />);
    const card = screen.getByTestId('watchlist-card');
    expect(card).toHaveTextContent('Failed: Already in watchlist');
    expect(card.className).toMatch(/border-red-500/);
  });

  it('renders nothing when actions is null', () => {
    const { container } = render(<ChatActionCard actions={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when trades and watchlist_changes arrays are both empty', () => {
    const actions: ChatActions = {
      trades: [],
      watchlist_changes: [],
    };
    const { container } = render(<ChatActionCard actions={actions} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders multiple cards when multiple actions exist in a single response', () => {
    const actions: ChatActions = {
      trades: [
        { ticker: 'AAPL', side: 'buy', quantity: 10, price: 190.5, status: 'executed' },
        { ticker: 'MSFT', side: 'sell', quantity: 5, price: 420.0, status: 'executed' },
      ],
      watchlist_changes: [
        { ticker: 'PYPL', action: 'add', status: 'done' },
      ],
    };
    render(<ChatActionCard actions={actions} />);
    const tradeCards = screen.getAllByTestId('trade-card');
    expect(tradeCards).toHaveLength(2);
    const watchlistCards = screen.getAllByTestId('watchlist-card');
    expect(watchlistCards).toHaveLength(1);
  });
});
