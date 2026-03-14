import type { WatchlistEntry, PortfolioSummary, PortfolioSnapshot } from './types';

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
  return apiFetch<WatchlistEntry[]>('/api/watchlist');
}

export async function fetchPortfolio(): Promise<PortfolioSummary> {
  return apiFetch<PortfolioSummary>('/api/portfolio');
}

export async function fetchPortfolioHistory(): Promise<PortfolioSnapshot[]> {
  return apiFetch<PortfolioSnapshot[]>('/api/portfolio/history');
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

export async function executeTrade(
  ticker: string,
  side: 'buy' | 'sell',
  quantity: number,
): Promise<unknown> {
  return apiFetch<unknown>('/api/portfolio/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, side, quantity }),
  });
}
