'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePriceStream, type PriceState } from '@/lib/use-prices';
import { fetchPortfolio, fetchWatchlist } from '@/lib/api';
import type { PortfolioSummary, WatchlistEntry } from '@/lib/types';

interface PriceContextValue extends PriceState {
  portfolio: PortfolioSummary | null;
  watchlist: WatchlistEntry[];
  selectedTicker: string | null;
  setSelectedTicker: (ticker: string | null) => void;
  refreshPortfolio: () => Promise<void>;
  refreshWatchlist: () => Promise<void>;
}

const PriceContext = createContext<PriceContextValue | null>(null);

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const priceState = usePriceStream();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const portfolioRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPortfolio = useCallback(async () => {
    try {
      const data = await fetchPortfolio();
      setPortfolio(data);
    } catch {
      // Silently ignore — will retry on next tick
    }
  }, []);

  const refreshWatchlist = useCallback(async () => {
    try {
      const data = await fetchWatchlist();
      setWatchlist(data);
    } catch {
      // Silently ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshPortfolio();
    refreshWatchlist();
  }, [refreshPortfolio, refreshWatchlist]);

  // Throttled portfolio refresh on price updates: at most once per 2 seconds
  // Triggered by prices changing (from SSE), not on every tick
  const pricesRef = useRef(priceState.prices);
  useEffect(() => {
    if (priceState.prices === pricesRef.current) return;
    pricesRef.current = priceState.prices;

    if (portfolioRefreshRef.current) return; // already scheduled
    portfolioRefreshRef.current = setTimeout(async () => {
      portfolioRefreshRef.current = null;
      await refreshPortfolio();
    }, 1500);
  }, [priceState.prices, refreshPortfolio]);

  return (
    <PriceContext.Provider
      value={{
        ...priceState,
        portfolio,
        watchlist,
        selectedTicker,
        setSelectedTicker,
        refreshPortfolio,
        refreshWatchlist,
      }}
    >
      {children}
    </PriceContext.Provider>
  );
}

export function usePriceContext(): PriceContextValue {
  const ctx = useContext(PriceContext);
  if (!ctx) throw new Error('usePriceContext must be used inside PriceProvider');
  return ctx;
}
