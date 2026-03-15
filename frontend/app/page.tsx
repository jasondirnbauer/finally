import { PriceProvider } from '@/context/PriceContext';
import { Header } from '@/components/Header';
import { Watchlist } from '@/components/Watchlist';
import { ChartPanel } from '@/components/ChartPanel';
import { PortfolioHeatmap } from '@/components/PortfolioHeatmap';
import { PnlChart } from '@/components/PnlChart';
import { PositionsTable } from '@/components/PositionsTable';

function PortfolioPanel() {
  return (
    <div className="grid grid-cols-2 grid-rows-[1fr_1fr] gap-2 h-full">
      {/* Top left: Heatmap */}
      <div className="min-h-0">
        <PortfolioHeatmap />
      </div>
      {/* Top right: P&L chart */}
      <div className="min-h-0">
        <PnlChart />
      </div>
      {/* Bottom: Positions table spanning full width */}
      <div className="col-span-2 min-h-0 overflow-auto">
        <PositionsTable />
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

          {/* Right column: Chart (60%) + Portfolio (40%) */}
          <div className="grid grid-rows-[3fr_2fr] gap-2 overflow-hidden">
            {/* Chart area (top) */}
            <ChartPanel />

            {/* Portfolio area (bottom) */}
            <PortfolioPanel />
          </div>
        </div>
      </div>
    </PriceProvider>
  );
}
