'use client';

import { useState } from 'react';
import { usePriceContext } from '@/context/PriceContext';
import { addToWatchlist, removeFromWatchlist } from '@/lib/api';
import { WatchlistRow } from './WatchlistRow';

export function Watchlist() {
  const { prices, priceHistory, watchlist, selectedTicker, setSelectedTicker, refreshWatchlist } = usePriceContext();
  const [newTicker, setNewTicker] = useState('');

  async function handleAdd() {
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;
    try {
      await addToWatchlist(ticker);
      setNewTicker('');
      await refreshWatchlist();
    } catch {
      // silently ignore duplicates / errors
    }
  }

  async function handleRemove(ticker: string) {
    try {
      await removeFromWatchlist(ticker);
      await refreshWatchlist();
    } catch {
      // silently ignore
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd();
  }

  return (
    <div className="flex flex-col h-full bg-terminal-surface border border-terminal-border rounded overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-terminal-border shrink-0">
        <span className="text-terminal-muted text-xs uppercase tracking-widest font-mono">
          Watchlist
        </span>
      </div>

      {/* Add ticker input */}
      <div className="px-2 py-1.5 border-b border-terminal-border/50 shrink-0">
        <input
          type="text"
          placeholder="Add ticker"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-terminal-text text-xs font-mono uppercase placeholder-terminal-muted focus:outline-none focus:border-terminal-blue"
        />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[80px_60px_1fr_80px_20px] px-2 py-1 border-b border-terminal-border/50 shrink-0">
        <span className="text-terminal-muted text-xs font-mono">Ticker</span>
        <span className="text-terminal-muted text-xs font-mono text-center">Trend</span>
        <span className="text-terminal-muted text-xs font-mono text-right">Price</span>
        <span className="text-terminal-muted text-xs font-mono text-right">Change</span>
        <span />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {watchlist.length === 0 ? (
          <div className="px-3 py-4 text-terminal-muted text-xs">Loading...</div>
        ) : (
          watchlist.map((entry) => (
            <WatchlistRow
              key={entry.ticker}
              ticker={entry.ticker}
              update={prices[entry.ticker]}
              priceHistory={priceHistory[entry.ticker] ?? []}
              selected={selectedTicker === entry.ticker}
              onClick={() => setSelectedTicker(entry.ticker)}
              onRemove={() => handleRemove(entry.ticker)}
            />
          ))
        )}
      </div>
    </div>
  );
}
