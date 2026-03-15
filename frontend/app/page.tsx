import { PriceProvider } from '@/context/PriceContext';
import { Header } from '@/components/Header';
import { Watchlist } from '@/components/Watchlist';
import { ChartPanel } from '@/components/ChartPanel';

function PortfolioAreaPlaceholder() {
  return (
    <div className="h-full bg-terminal-surface border border-terminal-border rounded p-3">
      <div className="text-terminal-muted text-xs uppercase tracking-wide font-mono">
        Portfolio — Phase 3
      </div>
    </div>
  );
}

export default function TradingTerminal() {
  return (
    <PriceProvider>
      <div className="h-screen flex flex-col bg-terminal-bg overflow-hidden">
        {/* Header — fixed top bar */}
        <Header />

        {/* Main trading grid */}
        <div className="flex-1 grid grid-cols-[320px_1fr] gap-2 p-2 overflow-hidden">
          {/* Left column: Watchlist */}
          <div className="flex flex-col overflow-hidden">
            <Watchlist />
          </div>

          {/* Right column: Chart + Portfolio grid */}
          <div className="grid grid-rows-[1fr_auto] gap-2 overflow-hidden">
            {/* Chart area (top) */}
            <ChartPanel />

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
