'use client';

import { usePriceContext } from '@/context/PriceContext';
import { WatchlistRow } from './WatchlistRow';

export function Watchlist() {
  const { prices, watchlist, selectedTicker, setSelectedTicker } = usePriceContext();

  return (
    <div className="flex flex-col h-full bg-terminal-surface border border-terminal-border rounded overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-terminal-border shrink-0">
        <span className="text-terminal-muted text-xs uppercase tracking-widest font-mono">
          Watchlist
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[80px_1fr_80px] px-2 py-1 border-b border-terminal-border/50 shrink-0">
        <span className="text-terminal-muted text-xs font-mono">Ticker</span>
        <span className="text-terminal-muted text-xs font-mono text-right">Price</span>
        <span className="text-terminal-muted text-xs font-mono text-right">Change</span>
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
              selected={selectedTicker === entry.ticker}
              onClick={() => setSelectedTicker(entry.ticker)}
            />
          ))
        )}
      </div>
    </div>
  );
}
