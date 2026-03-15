import type { WatchlistEntry, PortfolioSummary, PortfolioSnapshot, ChatActions, ChatMessage } from './types';

const BASE = '';  // Same origin — all calls go to /api/*

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  const data = await apiFetch<{ watchlist: WatchlistEntry[] }>('/api/watchlist');
  return data.watchlist;
}

export async function fetchPortfolio(): Promise<PortfolioSummary> {
  return apiFetch<PortfolioSummary>('/api/portfolio');
}

export async function fetchPortfolioHistory(): Promise<PortfolioSnapshot[]> {
  const data = await apiFetch<{ snapshots: PortfolioSnapshot[] }>('/api/portfolio/history');
  return data.snapshots;
}

export async function addToWatchlist(ticker: string): Promise<void> {
  return apiFetch<void>('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
  });
}

export async function removeFromWatchlist(ticker: string): Promise<void> {
  return apiFetch<void>(`/api/watchlist/${ticker}`, { method: 'DELETE' });
}

export interface TradeResult {
  trade: {
    id: string;
    ticker: string;
    side: string;
    quantity: number;
    price: number;
    executed_at: string;
  };
  cash: number;
  total_value: number;
}

export async function executeTrade(
  ticker: string,
  side: 'buy' | 'sell',
  quantity: number,
): Promise<TradeResult> {
  return apiFetch<TradeResult>('/api/portfolio/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, side, quantity }),
  });
}

// --- Chat API ---

export interface ChatResponse {
  message: string;
  trades?: ChatActions['trades'];
  watchlist_changes?: ChatActions['watchlist_changes'];
}

export interface ChatHistoryResponse {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actions: string | null; // JSON string from DB
    created_at: string;
  }>;
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const data = await apiFetch<ChatHistoryResponse>('/api/chat/history');
  return data.messages.map((m) => ({
    ...m,
    actions: m.actions ? JSON.parse(m.actions) : null,
  }));
}
