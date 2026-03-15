'use client';

import { usePriceContext } from '@/context/PriceContext';
import { formatPrice, formatCurrency, formatQuantity, formatChangePct } from '@/lib/format';

export function PositionsTable() {
  const { portfolio } = usePriceContext();

  const positions = portfolio?.positions ?? [];

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded overflow-hidden h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-xs uppercase tracking-wide font-mono">
          Positions
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono">
          No positions
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-terminal-muted text-left">
                <th className="px-3 py-1.5 font-normal">Ticker</th>
                <th className="px-3 py-1.5 font-normal text-right">Qty</th>
                <th className="px-3 py-1.5 font-normal text-right">Avg Cost</th>
                <th className="px-3 py-1.5 font-normal text-right">Price</th>
                <th className="px-3 py-1.5 font-normal text-right">P&L</th>
                <th className="px-3 py-1.5 font-normal text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const pnlColor =
                  pos.unrealized_pnl === null
                    ? 'text-terminal-muted'
                    : pos.unrealized_pnl >= 0
                      ? 'text-green-400'
                      : 'text-red-400';

                return (
                  <tr
                    key={pos.ticker}
                    className="hover:bg-terminal-border/30 border-t border-terminal-border/50"
                  >
                    <td className="px-3 py-1.5 text-terminal-yellow font-bold">
                      {pos.ticker}
                    </td>
                    <td className="px-3 py-1.5 text-right text-terminal-text">
                      {formatQuantity(pos.quantity)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-terminal-text">
                      {formatPrice(pos.avg_cost)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-terminal-text">
                      {pos.current_price !== null ? formatPrice(pos.current_price) : '—'}
                    </td>
                    <td className={`px-3 py-1.5 text-right ${pnlColor}`}>
                      {pos.unrealized_pnl !== null ? formatCurrency(pos.unrealized_pnl) : '—'}
                    </td>
                    <td className={`px-3 py-1.5 text-right ${pnlColor}`}>
                      {pos.pnl_percent !== null ? formatChangePct(pos.pnl_percent) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
