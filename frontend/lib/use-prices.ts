'use client';

import { useState, useEffect } from 'react';
import type { PriceUpdate, ConnectionStatus } from './types';

export interface PriceState {
  prices: Record<string, PriceUpdate>;         // latest price per ticker
  priceHistory: Record<string, number[]>;       // accumulated for sparklines (Phase 3) — capped at 200
  status: ConnectionStatus;
}

export function usePriceStream(): PriceState {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting');

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let staleTimer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    const resetStaleTimer = () => {
      if (staleTimer) clearTimeout(staleTimer);
      // If no SSE message in 10 seconds, treat as disconnected and reconnect
      staleTimer = setTimeout(() => {
        if (!mounted) return;
        setStatus('reconnecting');
        es?.close();
        reconnectTimer = setTimeout(connect, 1000);
      }, 10000);
    };

    const connect = () => {
      if (!mounted) return;
      es = new EventSource('/api/stream/prices');

      es.onopen = () => {
        if (!mounted) return;
        setStatus('connected');
        resetStaleTimer();
      };

      es.onmessage = (event: MessageEvent) => {
        if (!mounted) return;
        try {
          const parsed = JSON.parse(event.data);
          // SSE sends all tickers as a single object: { "AAPL": {...}, "AMZN": {...}, ... }
          const updates: Record<string, PriceUpdate> = parsed;
          setPrices(prev => ({ ...prev, ...updates }));
          setPriceHistory(prev => {
            const next = { ...prev };
            for (const [ticker, update] of Object.entries(updates)) {
              next[ticker] = [...(prev[ticker] ?? []), update.price].slice(-200);
            }
            return next;
          });
          resetStaleTimer();
        } catch {
          // Ignore malformed events
        }
      };

      es.onerror = () => {
        if (!mounted) return;
        setStatus('reconnecting');
        es?.close();
        es = null;
        if (staleTimer) clearTimeout(staleTimer);
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      mounted = false;
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (staleTimer) clearTimeout(staleTimer);
    };
  }, []);

  return { prices, priceHistory, status };
}
