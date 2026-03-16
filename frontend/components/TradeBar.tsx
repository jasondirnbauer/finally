'use client';

import { useState } from 'react';
import { executeTrade } from '@/lib/api';
import { usePriceContext } from '@/context/PriceContext';

function parseErrorDetail(err: unknown): string {
  if (!(err instanceof Error)) return 'Trade failed';
  const msg = err.message;
  // Format: "API /api/portfolio/trade failed 400: {\"detail\":\"...\"}"
  const colonIdx = msg.indexOf(': ');
  if (colonIdx === -1) return msg;
  const bodyStr = msg.slice(colonIdx + 2);
  try {
    const parsed = JSON.parse(bodyStr);
    if (parsed.detail) return parsed.detail;
  } catch {
    // JSON parse failed — fall back to full message
  }
  return msg;
}

export function TradeBar() {
  const { refreshPortfolio } = usePriceContext();
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTrade(side: 'buy' | 'sell') {
    setError(null);
    setConfirmation(null);

    const trimmedTicker = ticker.trim();
    const parsedQty = parseFloat(quantity);
    if (!trimmedTicker || isNaN(parsedQty) || parsedQty <= 0) {
      setError('Enter a valid ticker and quantity');
      return;
    }

    setLoading(true);
    try {
      const result = await executeTrade(trimmedTicker.toUpperCase(), side, parsedQty);
      setConfirmation(
        `${side.toUpperCase()} ${parsedQty} ${trimmedTicker.toUpperCase()} @ $${result.trade.price.toFixed(2)}`
      );
      setTicker('');
      setQuantity('');
      await refreshPortfolio();
    } catch (err) {
      setError(parseErrorDetail(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded p-2 flex items-center gap-2">
      <input
        type="text"
        placeholder="Ticker"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        className="bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-terminal-text text-xs font-mono w-20 uppercase"
      />
      <input
        type="text"
        placeholder="Qty"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-terminal-text text-xs font-mono w-16"
        inputMode="decimal"
      />
      <button
        onClick={() => handleTrade('buy')}
        disabled={loading}
        className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded"
      >
        Buy
      </button>
      <button
        onClick={() => handleTrade('sell')}
        disabled={loading}
        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded"
      >
        Sell
      </button>
      {confirmation && (
        <span className="text-green-400 text-xs font-mono ml-2" data-testid="trade-confirmation">
          {confirmation}
        </span>
      )}
      {error && (
        <span className="text-red-400 text-xs font-mono ml-2" data-testid="trade-error">
          {error}
        </span>
      )}
    </div>
  );
}
