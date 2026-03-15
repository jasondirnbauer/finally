'use client';

import { useEffect, useRef } from 'react';
import { createChart, LineSeries, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';

interface PriceChartProps {
  ticker: string | null;
  data: number[];
}

export function PriceChart({ ticker, data }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Create chart once when component mounts
  useEffect(() => {
    if (!containerRef.current || !ticker || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a2e' },
        textColor: '#718096',
      },
      grid: {
        vertLines: { color: '#2d3748' },
        horzLines: { color: '#2d3748' },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      timeScale: { visible: false },
    });

    const series = chart.addSeries(LineSeries, {
      color: '#209dd7',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver(([entry]) => {
      chart.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [ticker]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data when data array changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || data.length === 0) return;

    const chartData = data.map((price, i) => ({
      time: i as unknown as Time,
      value: price,
    }));

    seriesRef.current.setData(chartData);
    chartRef.current.timeScale().fitContent();
  }, [data, ticker]);

  if (!ticker || data.length === 0) {
    return (
      <div className="w-full h-full bg-terminal-surface border border-terminal-border rounded flex items-center justify-center">
        <span className="text-terminal-muted text-sm font-mono">
          Select a ticker to view chart
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" data-testid="price-chart">
      <span className="absolute top-2 left-3 text-terminal-yellow font-mono text-sm font-bold z-10">
        {ticker}
      </span>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
