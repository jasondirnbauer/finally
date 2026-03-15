'use client';

import { usePriceContext } from '@/context/PriceContext';
import { PriceChart } from './PriceChart';

export function ChartPanel() {
  const { selectedTicker, priceHistory } = usePriceContext();
  const data = selectedTicker ? (priceHistory[selectedTicker] ?? []) : [];

  return <PriceChart ticker={selectedTicker} data={data} />;
}
