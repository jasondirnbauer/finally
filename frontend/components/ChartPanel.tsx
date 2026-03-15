'use client';

import { usePriceContext } from '@/context/PriceContext';
import { PriceChart } from './PriceChart';
import { TradeBar } from './TradeBar';

export function ChartPanel() {
  const { selectedTicker, priceHistory } = usePriceContext();
  const data = selectedTicker ? (priceHistory[selectedTicker] ?? []) : [];

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 min-h-0">
        <PriceChart ticker={selectedTicker} data={data} />
      </div>
      <TradeBar />
    </div>
  );
}
