'use client';

import { usePriceContext } from '@/context/PriceContext';
import { Treemap, ResponsiveContainer } from 'recharts';

interface TreemapCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  pnlPercent?: number;
}

function CustomContent({ x = 0, y = 0, width = 0, height = 0, name, pnlPercent = 0 }: TreemapCellProps) {
  const absPercent = Math.abs(pnlPercent);
  const alpha = Math.min(0.3 + absPercent * 0.07, 1);
  const fill =
    pnlPercent >= 0
      ? `rgba(34, 197, 94, ${alpha})`
      : `rgba(239, 68, 68, ${alpha})`;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="#2d3748"
        strokeWidth={2}
      />
      {width > 40 && height > 20 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#e2e8f0"
          fontSize={11}
          fontWeight="bold"
        >
          {name}
        </text>
      )}
    </g>
  );
}

export function PortfolioHeatmap() {
  const { portfolio } = usePriceContext();

  const positions = portfolio?.positions ?? [];
  const data = positions
    .filter((p) => p.market_value > 0)
    .map((p) => ({
      name: p.ticker,
      size: p.market_value,
      pnlPercent: p.pnl_percent ?? 0,
      unrealizedPnl: p.unrealized_pnl ?? 0,
    }));

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded overflow-hidden h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-terminal-border">
        <span className="text-terminal-muted text-xs uppercase tracking-wide font-mono">
          Heatmap
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-xs font-mono">
          No positions to display
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              content={<CustomContent />}
              isAnimationActive={false}
            />
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
