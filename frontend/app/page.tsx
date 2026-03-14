import { PriceProvider } from '@/context/PriceContext';

// Placeholder components — replaced in 02-03 with real implementations
function HeaderPlaceholder() {
  return (
    <header className="h-12 bg-terminal-surface border-b border-terminal-border flex items-center px-4">
      <span className="text-terminal-yellow font-bold tracking-wide text-sm">FinAlly</span>
      <span className="ml-2 text-terminal-muted text-xs">AI Trading Workstation</span>
    </header>
  );
}

function WatchlistPlaceholder() {
  return (
    <div className="h-full bg-terminal-surface border border-terminal-border rounded p-3">
      <div className="text-terminal-muted text-xs uppercase tracking-wide mb-2">Watchlist</div>
      <div className="text-terminal-muted text-xs">Loading...</div>
    </div>
  );
}

function ChartAreaPlaceholder() {
  return (
    <div className="h-full bg-terminal-surface border border-terminal-border rounded flex items-center justify-center">
      <span className="text-terminal-muted text-sm">Select a ticker to view chart</span>
    </div>
  );
}

function PortfolioAreaPlaceholder() {
  return (
    <div className="h-full bg-terminal-surface border border-terminal-border rounded p-3">
      <div className="text-terminal-muted text-xs uppercase tracking-wide">Portfolio</div>
    </div>
  );
}

export default function TradingTerminal() {
  return (
    <PriceProvider>
      <div className="h-screen flex flex-col bg-terminal-bg overflow-hidden">
        {/* Header — fixed top bar */}
        <HeaderPlaceholder />

        {/* Main trading grid */}
        <div className="flex-1 grid grid-cols-[320px_1fr] gap-2 p-2 overflow-hidden">
          {/* Left column: Watchlist */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <div className="flex-1 overflow-auto">
              <WatchlistPlaceholder />
            </div>
          </div>

          {/* Right column: Chart + Portfolio grid */}
          <div className="grid grid-rows-[1fr_auto] gap-2 overflow-hidden">
            {/* Chart area (top) */}
            <ChartAreaPlaceholder />

            {/* Portfolio area (bottom) — reserved for Phase 3 */}
            <div className="h-48">
              <PortfolioAreaPlaceholder />
            </div>
          </div>
        </div>
      </div>
    </PriceProvider>
  );
}
