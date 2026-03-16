'use client';

import { useEffect, useState } from 'react';
import { formatPrice, formatChange, formatChangePct } from '@/lib/format';
import { Sparkline } from './Sparkline';
import type { PriceUpdate } from '@/lib/types';

interface WatchlistRowProps {
  ticker: string;
  update: PriceUpdate | undefined;
  priceHistory: number[];
  selected: boolean;
  onClick: () => void;
  onRemove?: () => void;
}

export function WatchlistRow({ ticker, update, priceHistory, selected, onClick, onRemove }: WatchlistRowProps) {
  const [flashClass, setFlashClass] = useState('');

  // Key on timestamp — re-triggers even for same price value
  useEffect(() => {
    if (!update) return;
    const cls = update.direction === 'up' ? 'flash-green' : update.direction === 'down' ? 'flash-red' : '';
    if (!cls) return;
    setFlashClass(cls);
    const timer = setTimeout(() => setFlashClass(''), 500);
    return () => clearTimeout(timer);
  }, [update?.timestamp]); // CRITICAL: timestamp, not price

  const changeColor = !update
    ? 'text-terminal-muted'
    : update.direction === 'up'
      ? 'text-terminal-green'
      : update.direction === 'down'
        ? 'text-terminal-red'
        : 'text-terminal-muted';

  return (
    <div
      data-ticker={ticker}
      data-selected={selected ? 'true' : 'false'}
      onClick={onClick}
      className={[
        'grid grid-cols-[80px_60px_1fr_80px_20px] items-center px-2 py-1.5 cursor-pointer rounded',
        'hover:bg-terminal-border/30 transition-colors',
        selected ? 'bg-terminal-blue/10 ring-1 ring-terminal-blue/30' : '',
        flashClass,
      ].join(' ')}
    >
      <span className="text-terminal-yellow font-bold text-xs font-mono">{ticker}</span>
      <span className="flex items-center justify-center">
        <Sparkline data={priceHistory} />
      </span>
      <span className="text-terminal-text text-xs font-mono tabular-nums text-right">
        {update ? formatPrice(update.price) : '\u2014'}
      </span>
      <span className={`text-xs font-mono tabular-nums text-right ${changeColor}`}>
        {update
          ? `${formatChange(update.change)} (${formatChangePct((update.change / update.previous_price) * 100)})`
          : '\u2014'}
      </span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-terminal-muted hover:text-red-400 text-xs font-mono leading-none ml-1"
          aria-label={`Remove ${ticker}`}
        >
          x
        </button>
      )}
    </div>
  );
}
