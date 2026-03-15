'use client';

import type { ChatActions } from '@/lib/types';

interface ChatActionCardProps {
  actions: ChatActions | null;
}

export function ChatActionCard({ actions }: ChatActionCardProps) {
  if (!actions) return null;

  const trades = actions.trades ?? [];
  const watchlistChanges = actions.watchlist_changes ?? [];

  if (trades.length === 0 && watchlistChanges.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {trades.map((trade, i) => {
        const isFailed = !!trade.error;
        const isSell = trade.side === 'sell';
        const borderColor = isFailed || isSell ? 'border-red-500' : 'border-green-500';
        const textColor = isFailed
          ? 'text-terminal-red'
          : isSell
            ? 'text-terminal-red'
            : 'text-terminal-green';

        let text: string;
        if (isFailed) {
          text = `Failed: ${trade.error}`;
        } else if (trade.side === 'buy') {
          text = `Bought ${trade.quantity} ${trade.ticker} at $${trade.price!.toFixed(2)}`;
        } else {
          text = `Sold ${trade.quantity} ${trade.ticker} at $${trade.price!.toFixed(2)}`;
        }

        return (
          <div
            key={`trade-${i}`}
            data-testid="trade-card"
            className={`border-l-2 ${borderColor} px-3 py-2 text-xs font-mono bg-terminal-bg/50 rounded-r`}
          >
            <span className={textColor}>{text}</span>
          </div>
        );
      })}

      {watchlistChanges.map((change, i) => {
        const isFailed = !!change.error;
        const borderColor = isFailed ? 'border-red-500' : 'border-blue-500';
        const textColor = isFailed ? 'text-terminal-red' : 'text-terminal-blue';

        let text: string;
        if (isFailed) {
          text = `Failed: ${change.error}`;
        } else if (change.action === 'add') {
          text = `Added ${change.ticker} to watchlist`;
        } else {
          text = `Removed ${change.ticker} from watchlist`;
        }

        return (
          <div
            key={`watchlist-${i}`}
            data-testid="watchlist-card"
            className={`border-l-2 ${borderColor} px-3 py-2 text-xs font-mono bg-terminal-bg/50 rounded-r`}
          >
            <span className={textColor}>{text}</span>
          </div>
        );
      })}
    </div>
  );
}
