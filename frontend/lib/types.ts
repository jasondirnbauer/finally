export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface PriceUpdate {
  ticker: string;
  price: number;
  previous_price: number;
  timestamp: string;    // ISO — used as updateKey for flash animation trigger
  change: number;       // price - previous_price
  direction: 'up' | 'down' | 'unchanged';
}

export interface WatchlistEntry {
  ticker: string;
  price: number | null;
  added_at: string;
}

export interface Position {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  market_value: number;
  unrealized_pnl: number | null;
  pnl_percent: number | null;
}

export interface PortfolioSummary {
  cash: number;
  total_value: number;
  total_market_value: number;
  unrealized_pnl: number;
  positions: Position[];
}

export interface PortfolioSnapshot {
  id: string;
  total_value: number;
  recorded_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions: ChatActions | null;
  created_at: string;
}

export interface ChatActions {
  trades?: Array<{
    ticker: string;
    side: 'buy' | 'sell';
    quantity: number;
    price?: number;       // present on success
    status?: string;      // "executed" on success
    error?: string;       // present on failure
  }>;
  watchlist_changes?: Array<{
    ticker: string;
    action: 'add' | 'remove';
    status?: string;      // "done" on success
    error?: string;       // present on failure
  }>;
}
