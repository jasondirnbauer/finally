'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchPortfolioHistory } from '@/lib/api';
import type { PortfolioSnapshot } from '@/lib/types';

export function PnlChart() {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);

  useEffect(() => {
    let cancelled = false;

    const doFetch = () => {
      fetchPortfolioHistory()
        .then((data) => {
          if (!cancelled) setSnapshots(data);
        })
        .catch(() => {});
    };

    doFetch(); // initial fetch
    const interval = setInterval(doFetch, 30_000); // re-fetch every 30s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded overflow-hidden h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-xs uppercase tracking-wide font-mono">
          P&L
        </span>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono">
          No data yet
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={snapshots}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <XAxis dataKey="recorded_at" tick={false} stroke="#4a5568" />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#718096', fontSize: 10 }}
                width={60}
                stroke="#4a5568"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #2d3748',
                  color: '#e2e8f0',
                  fontSize: 11,
                }}
                formatter={(value) => ['$' + Number(value).toFixed(2), 'Value']}
              />
              <Line
                type="monotone"
                dataKey="total_value"
                stroke="#209dd7"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
