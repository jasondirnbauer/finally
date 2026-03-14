'use client';

import { usePriceContext } from '@/context/PriceContext';
import { formatCurrency } from '@/lib/format';
import type { ConnectionStatus } from '@/lib/types';

const STATUS_DOT: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  reconnecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-red-500',
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Live',
  reconnecting: 'Reconnecting...',
  disconnected: 'Disconnected',
};

export function Header() {
  const { status, portfolio } = usePriceContext();

  return (
    <header className="h-12 bg-terminal-surface border-b border-terminal-border flex items-center px-4 gap-6 shrink-0">
      {/* Branding */}
      <div className="flex items-center gap-2">
        <span className="text-terminal-yellow font-bold tracking-wide text-sm font-mono">
          FinAlly
        </span>
        <span className="text-terminal-muted text-xs hidden sm:block">AI Trading Workstation</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Portfolio stats */}
      <div className="flex items-center gap-6 text-xs font-mono">
        <div className="flex flex-col items-end">
          <span className="text-terminal-muted uppercase tracking-wide" style={{ fontSize: '9px' }}>
            Portfolio
          </span>
          <span className="text-terminal-blue font-semibold tabular-nums">
            {portfolio ? formatCurrency(portfolio.total_value) : '\u2014'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-terminal-muted uppercase tracking-wide" style={{ fontSize: '9px' }}>
            Cash
          </span>
          <span className="text-terminal-text font-semibold tabular-nums">
            {portfolio ? formatCurrency(portfolio.cash_balance) : '\u2014'}
          </span>
        </div>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span
          data-testid="status-dot"
          className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[status]}`}
          title={STATUS_LABEL[status]}
        />
        <span className="text-terminal-muted text-xs hidden md:block">{STATUS_LABEL[status]}</span>
      </div>
    </header>
  );
}
