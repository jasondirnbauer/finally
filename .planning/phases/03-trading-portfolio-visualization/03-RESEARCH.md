# Phase 3: Trading + Portfolio Visualization - Research

**Researched:** 2026-03-14
**Domain:** Lightweight Charts (TradingView), Recharts Treemap, trade execution UI, portfolio visualization, sparkline rendering, React component architecture
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHART-01 | Main price chart for selected ticker using canvas-based charting library (Lightweight Charts) | Lightweight Charts v5 with `createChart` + `LineSeries` import; data from `priceHistory` in PriceContext; real-time via `update()` method |
| CHART-02 | Portfolio heatmap/treemap -- positions sized by portfolio weight, colored by P&L (green=profit, red=loss) | Recharts `<Treemap>` with `content` prop for custom SVG rendering; data from `GET /api/portfolio` positions array |
| CHART-03 | P&L history line chart showing total portfolio value over time from portfolio_snapshots | Recharts `<LineChart>` with `<ResponsiveContainer>`; data from `GET /api/portfolio/history` snapshots array |
| CHART-04 | Positions table -- ticker, quantity, avg cost, current price, unrealized P&L, % change | Pure HTML table styled with Tailwind; data from `GET /api/portfolio` positions array; live updates via PriceContext |
| TRADE-01 | Trade bar with ticker field, quantity field, buy button, sell button | Controlled form component; POST to `/api/portfolio/trade`; ticker auto-uppercase |
| TRADE-02 | Market orders execute instantly at current price with no confirmation dialog | Direct `executeTrade()` API call on button click; refresh portfolio after success |
| TRADE-03 | Validation -- insufficient cash for buys or insufficient shares for sells returns clear error | Backend returns 400 with `detail` message; frontend displays inline error, clears on next attempt |
| DISP-03 | Sparkline mini-charts beside each ticker, accumulated from SSE data since page load | Tiny canvas or SVG polyline component consuming `priceHistory[ticker]` from PriceContext |
</phase_requirements>

---

## Summary

Phase 3 transforms the streaming watchlist (Phase 2) into a full trading workstation by adding five new component groups: (1) a main price chart using TradingView Lightweight Charts, (2) a trade execution bar, (3) a positions table, (4) a portfolio heatmap/treemap, and (5) a P&L history chart. Additionally, sparkline mini-charts (DISP-03) are implemented beside each watchlist ticker using the `priceHistory` data already accumulated by the SSE hook from Phase 2.

The frontend architecture built in Phase 2 provides a solid foundation. PriceContext already holds `prices`, `priceHistory`, `portfolio`, `watchlist`, `selectedTicker`, `refreshPortfolio`, and `refreshWatchlist`. All backend endpoints needed for this phase already exist and are tested: `GET /api/portfolio` (positions with P&L), `POST /api/portfolio/trade` (atomic trade execution), and `GET /api/portfolio/history` (snapshots). The `executeTrade()` function is already wired in `lib/api.ts`.

The charting stack uses two libraries: **Lightweight Charts v5** for the main ticker price chart (canvas-based, high performance, finance-domain) and **Recharts v3** for the treemap heatmap and P&L line chart (SVG-based, React-native, declarative). This is a deliberate split -- Lightweight Charts excels at financial time series with real-time updates, while Recharts provides easy declarative treemap and line chart components that integrate naturally with React's rendering model.

**Primary recommendation:** Install `lightweight-charts` and `recharts` as the two charting dependencies. Build the main chart with imperative Lightweight Charts API via `useRef`/`useEffect`. Build the treemap and P&L chart with declarative Recharts components. Keep the trade bar as a simple controlled form. Wire all components to PriceContext for live data.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lightweight-charts | 5.1 | Main ticker price chart (canvas) | TradingView's official library; 45KB; canvas-based for performance; financial-domain API with `LineSeries`, `AreaSeries`; real-time `update()` method |
| recharts | 3.x (latest) | Treemap heatmap + P&L line chart | Most popular React charting library; declarative JSX API; built-in `<Treemap>` and `<LineChart>` components; SVG-based |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react (existing) | ^18 | Component framework | Already installed |
| tailwindcss (existing) | ^3.4 | Styling | Already installed |
| next (existing) | 14.2.35 | Framework | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Lightweight Charts | Recharts for everything | Recharts is SVG-based and less performant for real-time financial data; no native candlestick/line with crosshair |
| Recharts Treemap | D3 treemap from scratch | D3 requires significantly more code; Recharts wraps it with React-native API |
| Recharts LineChart | Lightweight Charts for P&L too | Overkill for a simple value-over-time line; Recharts is simpler and declarative |

**Installation:**
```bash
cd frontend && npm install lightweight-charts recharts
```

---

## Architecture Patterns

### Component Structure (Phase 3 additions)
```
frontend/
  components/
    Header.tsx              # (existing) -- no changes
    Watchlist.tsx            # (existing) -- no changes
    WatchlistRow.tsx         # (existing) -- add Sparkline child
    Sparkline.tsx            # NEW -- mini SVG polyline chart
    PriceChart.tsx           # NEW -- Lightweight Charts main chart
    TradeBar.tsx             # NEW -- trade execution form
    PositionsTable.tsx       # NEW -- tabular positions view
    PortfolioHeatmap.tsx     # NEW -- Recharts Treemap
    PnlChart.tsx             # NEW -- Recharts LineChart
  app/
    page.tsx                 # MODIFY -- replace placeholders with real components
  context/
    PriceContext.tsx         # (existing) -- no changes needed
  lib/
    api.ts                   # (existing) -- already has executeTrade, fetchPortfolioHistory
    types.ts                 # (existing) -- already has Position, PortfolioSummary, PortfolioSnapshot
    format.ts                # (existing) -- may add formatPnl helper
    use-prices.ts            # (existing) -- no changes
```

### Pattern 1: Imperative Chart via useRef/useEffect (Lightweight Charts)

**What:** Lightweight Charts v5 uses an imperative API. The chart is created on a DOM element via `createChart()`, series are added via `chart.addSeries(LineSeries)`, and data is set/updated imperatively.

**When to use:** For the main ticker price chart (CHART-01).

**Example:**
```typescript
// Source: https://tradingview.github.io/lightweight-charts/tutorials/react/simple
import { createChart, LineSeries, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface PriceChartProps {
  ticker: string;
  data: number[];  // priceHistory from context
}

export function PriceChart({ ticker, data }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
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
    };
  }, []);

  // Update data when ticker or data changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    // Convert accumulated price array to {time, value} format
    // Use sequential integer time since we don't have real timestamps
    const chartData = data.map((price, i) => ({
      time: i as any,  // Lightweight Charts accepts integer time for auto-scaling
      value: price,
    }));
    seriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [data, ticker]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

### Pattern 2: Declarative Recharts (Treemap + LineChart)

**What:** Recharts components are JSX-native. Pass data as props, customize via child components.

**When to use:** For the portfolio heatmap (CHART-02) and P&L chart (CHART-03).

**Example (Treemap):**
```typescript
import { Treemap, ResponsiveContainer } from 'recharts';
import type { Position } from '@/lib/types';

// CustomizedContent renders each treemap cell with P&L-based color
function CustomizedContent(props: any) {
  const { x, y, width, height, name, pnlPercent } = props;
  // Color: green gradient for profit, red gradient for loss
  const color = pnlPercent >= 0
    ? `rgba(34, 197, 94, ${Math.min(0.3 + Math.abs(pnlPercent) * 0.07, 1)})`
    : `rgba(239, 68, 68, ${Math.min(0.3 + Math.abs(pnlPercent) * 0.07, 1)})`;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height}
        style={{ fill: color, stroke: '#2d3748', strokeWidth: 1 }} />
      {width > 40 && height > 20 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle"
          fill="#e2e8f0" fontSize={12} dominantBaseline="central">
          {name}
        </text>
      )}
    </g>
  );
}
```

**Example (P&L LineChart):**
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// data = snapshots from GET /api/portfolio/history
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={snapshots}>
    <XAxis dataKey="recorded_at" tick={false} />
    <YAxis domain={['auto', 'auto']} tick={{ fill: '#718096', fontSize: 10 }} />
    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748' }} />
    <Line type="monotone" dataKey="total_value" stroke="#209dd7" dot={false} strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```

### Pattern 3: Sparkline as Minimal SVG Polyline

**What:** Sparklines are tiny inline charts showing price trend. Use a simple SVG `<polyline>` element -- no library needed.

**When to use:** For DISP-03 sparklines in each WatchlistRow.

**Example:**
```typescript
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 60, height = 20, color = '#209dd7' }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
  ).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
```

### Pattern 4: Trade Bar as Controlled Form with Error State

**What:** The trade bar is a compact form with ticker input, quantity input, Buy/Sell buttons, and inline error display. No confirmation dialog.

**When to use:** For TRADE-01, TRADE-02, TRADE-03.

**Example:**
```typescript
export function TradeBar() {
  const { refreshPortfolio } = usePriceContext();
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrade = async (side: 'buy' | 'sell') => {
    setError(null);
    const qty = parseFloat(quantity);
    if (!ticker.trim() || isNaN(qty) || qty <= 0) {
      setError('Enter a valid ticker and quantity');
      return;
    }
    setLoading(true);
    try {
      await executeTrade(ticker.toUpperCase(), side, qty);
      setTicker('');
      setQuantity('');
      await refreshPortfolio();
    } catch (err: any) {
      setError(err.message || 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  return (/* form UI with inputs and Buy/Sell buttons */);
}
```

### Anti-Patterns to Avoid
- **Wrapping Lightweight Charts in a React state loop:** Never store chart data in React state and pass it back to the chart on every render. Use refs for the chart/series instances, update imperatively.
- **Calling setData() on every SSE tick:** Use `update()` for single-point appends to Lightweight Charts. Only call `setData()` on initial load or ticker change.
- **SVG treemap at hundreds of positions:** The Recharts Treemap is fine for 10-50 positions (our use case), but would lag with hundreds. Not a concern here.
- **Fetching portfolio on every price tick:** Already solved -- PriceContext throttles portfolio refresh to once per 1.5s. The planner must not add additional fetch loops.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Financial price chart | Custom canvas rendering | `lightweight-charts` v5 | Crosshair, time scale, resize handling, real-time updates, all built-in |
| Treemap layout algorithm | Manual squarification | Recharts `<Treemap>` | Squarified treemap algorithm is non-trivial; Recharts wraps D3's implementation |
| Line chart for P&L | Custom SVG path generation | Recharts `<LineChart>` | Axes, tooltips, responsive container, smooth curves all built-in |
| Sparkline | Full charting library | SVG `<polyline>` (hand-rolled is fine) | Sparklines are so simple that a 15-line component beats adding a library dependency |
| Trade validation | Frontend-side balance checks | Backend `TradeService` | Backend is the source of truth for cash/positions; frontend just displays the error |
| Number formatting | Custom formatters | Existing `lib/format.ts` | Already has `formatPrice`, `formatCurrency`, `formatChange`, `formatChangePct`, `formatQuantity` |

**Key insight:** The main chart needs a canvas-based library because SVG degrades at hundreds of data points with real-time updates. Recharts (SVG) is fine for the treemap and P&L chart because they update infrequently (on trade or every 30s). The sparklines are tiny enough (max 200 points, no interactivity) that a raw SVG polyline is the best solution.

---

## Common Pitfalls

### Pitfall 1: Lightweight Charts Resize Issues
**What goes wrong:** Chart renders at 0x0 or doesn't resize when container changes.
**Why it happens:** `createChart()` takes explicit `width`/`height` in pixels, not CSS percentages. If the container isn't laid out yet, dimensions are 0.
**How to avoid:** Use `ResizeObserver` on the container element. Call `chart.applyOptions({ width, height })` on resize. Initialize only after the container is mounted (useEffect, not useMemo).
**Warning signs:** Chart area appears blank on first render or after window resize.

### Pitfall 2: Lightweight Charts Memory Leak on Unmount
**What goes wrong:** Chart instances pile up when navigating or switching tickers.
**Why it happens:** `createChart()` creates canvas elements and event listeners. Without explicit `chart.remove()`, they persist.
**How to avoid:** Call `chart.remove()` in the useEffect cleanup function. Also disconnect any ResizeObserver.
**Warning signs:** Increasing memory usage over time; multiple canvas elements in DOM.

### Pitfall 3: Lightweight Charts v5 Import Errors
**What goes wrong:** `chart.addLineSeries is not a function` error.
**Why it happens:** v5 changed the API from `chart.addLineSeries()` to `chart.addSeries(LineSeries, options)`. Many examples online still show v4 syntax.
**How to avoid:** Always import series types: `import { LineSeries } from 'lightweight-charts'`. Use `chart.addSeries(LineSeries, {...})`.
**Warning signs:** TypeError at runtime when creating series.

### Pitfall 4: Recharts Treemap Data Shape
**What goes wrong:** Treemap renders nothing or shows wrong proportions.
**Why it happens:** Recharts `<Treemap>` expects `{ name, children: [{ name, size }] }` hierarchy. Portfolio positions are a flat array.
**How to avoid:** Transform the positions array into Treemap format: wrap in a root object, use `market_value` as the `size` key, pass `pnlPercent` as a custom property for coloring.
**Warning signs:** Empty treemap, or all cells same size.

### Pitfall 5: Trade Form Double-Submit
**What goes wrong:** User clicks Buy/Sell rapidly, multiple trades execute.
**Why it happens:** No loading state guard on the submit handler.
**How to avoid:** Set `loading` state before the API call, disable buttons while loading, re-enable after completion.
**Warning signs:** Unexpected multiple trades in the trade history.

### Pitfall 6: Portfolio State Stale After Trade
**What goes wrong:** User executes a trade but positions/cash/total value don't update.
**Why it happens:** Trade API returns new values but the frontend doesn't refresh the portfolio context.
**How to avoid:** Call `refreshPortfolio()` from PriceContext after successful trade. The trade response includes new cash and total_value, but the full positions list requires a re-fetch.
**Warning signs:** Stale cash balance or positions after trade execution.

### Pitfall 7: Sparkline Rendering with Insufficient Data
**What goes wrong:** Sparkline renders a single dot or nothing on page load.
**Why it happens:** `priceHistory` starts empty and accumulates slowly (one price per ~500ms SSE tick).
**How to avoid:** Return null or a placeholder when `data.length < 2`. The sparkline will fill in progressively -- this is expected behavior per the PLAN.md.
**Warning signs:** Sparkline component errors on mount.

---

## Code Examples

### Backend API Response Shapes (verified from source)

**GET /api/portfolio** response:
```json
{
  "positions": [
    {
      "ticker": "AAPL",
      "quantity": 10,
      "avg_cost": 185.50,
      "current_price": 190.00,
      "market_value": 1900.00,
      "unrealized_pnl": 45.00,
      "pnl_percent": 2.43
    }
  ],
  "cash": 8145.00,
  "total_market_value": 1900.00,
  "total_value": 10045.00,
  "unrealized_pnl": 45.00
}
```

**POST /api/portfolio/trade** request:
```json
{ "ticker": "AAPL", "side": "buy", "quantity": 10 }
```

**POST /api/portfolio/trade** success response:
```json
{
  "trade": { "id": "", "ticker": "AAPL", "side": "buy", "quantity": 10, "price": 190.00, "executed_at": "" },
  "cash": 8100.00,
  "total_value": 10000.00
}
```

**POST /api/portfolio/trade** error response (400):
```json
{ "detail": "Insufficient cash. Need $1900.00, have $100.00" }
```

**GET /api/portfolio/history** response:
```json
{
  "snapshots": [
    { "id": "uuid", "total_value": 10000.00, "recorded_at": "2026-03-14T12:00:00Z" },
    { "id": "uuid", "total_value": 10045.00, "recorded_at": "2026-03-14T12:00:30Z" }
  ]
}
```

### Frontend Types Already Defined (verified from source)

All types needed for this phase already exist in `lib/types.ts`:
- `Position` -- ticker, quantity, avg_cost, current_price, unrealized_pnl, pnl_pct
- `PortfolioSummary` -- cash_balance, total_value, positions[]
- `PortfolioSnapshot` -- id, total_value, recorded_at

**Note:** The `Position` type uses `pnl_pct` but the API returns `pnl_percent`. The type also uses `cash_balance` but the API returns `cash`. These mismatches need fixing during implementation: update `lib/types.ts` to match the actual API response shape, or add a mapping layer.

### Frontend API Functions Already Defined (verified from source)

All API functions are in `lib/api.ts`:
- `fetchPortfolio()` -- returns `PortfolioSummary`
- `fetchPortfolioHistory()` -- returns `PortfolioSnapshot[]`
- `executeTrade(ticker, side, quantity)` -- returns `unknown`

**Note:** `fetchPortfolioHistory()` returns `PortfolioSnapshot[]` but the API wraps it in `{ snapshots: [...] }`. This needs to be reconciled -- either update the API function to unwrap, or update the type. Similarly, `fetchPortfolio()` returns `PortfolioSummary` but the API shape uses `cash` not `cash_balance` and has additional fields (`total_market_value`, `unrealized_pnl`).

### Existing PriceContext Data Available (verified from source)

```typescript
// Available via usePriceContext():
{
  prices: Record<string, PriceUpdate>,         // latest price per ticker
  priceHistory: Record<string, number[]>,       // accumulated prices (max 200) per ticker
  status: ConnectionStatus,                      // 'connected' | 'reconnecting' | 'disconnected'
  portfolio: PortfolioSummary | null,           // refreshed every 1.5s
  watchlist: WatchlistEntry[],                  // ticker list
  selectedTicker: string | null,                // currently selected ticker
  setSelectedTicker: (ticker: string | null) => void,
  refreshPortfolio: () => Promise<void>,        // manual refresh
  refreshWatchlist: () => Promise<void>,        // manual refresh
}
```

### Page Layout Integration Point (verified from source)

The current `page.tsx` has two placeholders to replace:
1. `<ChartAreaPlaceholder />` -- replace with `<PriceChart>` for the selected ticker
2. `<PortfolioAreaPlaceholder />` (inside `h-48` div) -- replace with portfolio panels (heatmap, P&L chart, positions table)

The grid layout is `grid-cols-[320px_1fr]` (watchlist left, content right) with `grid-rows-[1fr_auto]` (chart top, portfolio bottom). The portfolio area currently has a fixed `h-48` which will need to be expanded or made flexible.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chart.addLineSeries()` | `chart.addSeries(LineSeries)` | Lightweight Charts v5 (2024) | Must import series types separately |
| CommonJS `require()` | ESM `import` only | Lightweight Charts v5 | CJS no longer supported; Next.js ESM is fine |
| Series markers built-in | `createSeriesMarkers()` plugin | Lightweight Charts v5 | Markers extracted to primitives |
| Recharts 2.x | Recharts 3.x | 2025 | Minor API changes; Treemap API stable |

**Deprecated/outdated:**
- `chart.addLineSeries()`, `chart.addAreaSeries()`, etc. -- replaced by `chart.addSeries(Type, options)` in v5
- `chart.addWatermark()` -- extracted to plugin in v5

---

## Open Questions

1. **Lightweight Charts time format for accumulated data**
   - What we know: `priceHistory` is `number[]` (prices only, no timestamps). Lightweight Charts data format is `{ time, value }`.
   - What's unclear: Whether Lightweight Charts accepts sequential integers as `time` or requires ISO strings/Unix timestamps.
   - Recommendation: Use sequential integers (0, 1, 2, ...) as time values. Lightweight Charts v5 supports integer timestamps. Hide the time axis labels since the values are meaningless. If this causes issues, use Unix timestamps calculated from a base time + index * 500ms.

2. **Type mismatches between frontend types and API responses**
   - What we know: `Position.pnl_pct` vs API's `pnl_percent`; `PortfolioSummary.cash_balance` vs API's `cash`; `fetchPortfolioHistory` doesn't unwrap `{ snapshots: [...] }`.
   - What's unclear: Whether to fix the types or the API functions.
   - Recommendation: Fix `lib/types.ts` to match the actual API response shape. Update `PortfolioSummary` to use `cash` and add `total_market_value`, `unrealized_pnl`. Fix `fetchPortfolioHistory` to return `snapshots` from the wrapped response.

3. **Portfolio area layout sizing**
   - What we know: Current layout has `h-48` fixed height for portfolio area. Phase 3 adds heatmap, P&L chart, positions table, and trade bar.
   - What's unclear: How to fit 4 components in the bottom area without scrolling.
   - Recommendation: Change the right column from `grid-rows-[1fr_auto]` to a more flexible layout. Use a sub-grid or tabbed layout for the portfolio area. The heatmap and P&L chart could share a row, with positions table below, and trade bar docked at the very bottom.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 + React Testing Library 16 |
| Config file | `frontend/jest.config.ts` |
| Quick run command | `cd frontend && npx jest --passWithNoTests` |
| Full suite command | `cd frontend && npx jest --passWithNoTests --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHART-01 | PriceChart renders canvas element when ticker selected | unit (smoke) | `cd frontend && npx jest __tests__/PriceChart.test.tsx -x` | Wave 0 |
| CHART-02 | PortfolioHeatmap renders treemap rects from positions | unit | `cd frontend && npx jest __tests__/PortfolioHeatmap.test.tsx -x` | Wave 0 |
| CHART-03 | PnlChart renders line chart from snapshots | unit | `cd frontend && npx jest __tests__/PnlChart.test.tsx -x` | Wave 0 |
| CHART-04 | PositionsTable renders position rows with P&L data | unit | `cd frontend && npx jest __tests__/PositionsTable.test.tsx -x` | Wave 0 |
| TRADE-01 | TradeBar renders inputs and buy/sell buttons | unit | `cd frontend && npx jest __tests__/TradeBar.test.tsx -x` | Wave 0 |
| TRADE-02 | TradeBar calls executeTrade on button click | unit | `cd frontend && npx jest __tests__/TradeBar.test.tsx -x` | Wave 0 |
| TRADE-03 | TradeBar displays error from API on validation failure | unit | `cd frontend && npx jest __tests__/TradeBar.test.tsx -x` | Wave 0 |
| DISP-03 | Sparkline renders SVG polyline from price history | unit | `cd frontend && npx jest __tests__/Sparkline.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx jest --passWithNoTests`
- **Per wave merge:** `cd frontend && npx jest --passWithNoTests --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/PriceChart.test.tsx` -- covers CHART-01 (note: Lightweight Charts requires canvas mock)
- [ ] `frontend/__tests__/PortfolioHeatmap.test.tsx` -- covers CHART-02
- [ ] `frontend/__tests__/PnlChart.test.tsx` -- covers CHART-03
- [ ] `frontend/__tests__/PositionsTable.test.tsx` -- covers CHART-04
- [ ] `frontend/__tests__/TradeBar.test.tsx` -- covers TRADE-01, TRADE-02, TRADE-03
- [ ] `frontend/__tests__/Sparkline.test.tsx` -- covers DISP-03
- [ ] Canvas mock for Lightweight Charts in jest environment (jsdom doesn't have `<canvas>` by default -- may need `jest-canvas-mock` or manual mock of `createChart`)

### Testing Notes for Lightweight Charts
Lightweight Charts uses `<canvas>` which is not available in jsdom. Options:
1. **Mock the entire module:** `jest.mock('lightweight-charts')` and verify that `createChart` is called with correct options.
2. **Install `jest-canvas-mock`:** Provides a canvas polyfill for jsdom. This allows the chart to "render" but won't test visual output.
3. **Recommended:** Mock the module. The chart is imperative and visual -- unit tests should verify the component mounts, passes correct data shape, and cleans up on unmount. Visual correctness is an E2E concern (Phase 5).

---

## Sources

### Primary (HIGH confidence)
- Lightweight Charts v5 official docs: https://tradingview.github.io/lightweight-charts/docs -- API, series types, migration guide
- Lightweight Charts React tutorial: https://tradingview.github.io/lightweight-charts/tutorials/react/simple -- basic React integration pattern
- Lightweight Charts v4-to-v5 migration: https://tradingview.github.io/lightweight-charts/docs/migrations/from-v4-to-v5 -- breaking changes
- Recharts npm: https://www.npmjs.com/package/recharts -- v3.8.0 confirmed
- Recharts Treemap example: https://recharts.github.io/en-US/examples/CustomContentTreemap/ -- custom content rendering
- Backend source code: `backend/app/routes/portfolio.py`, `backend/app/services/trade_service.py` -- verified API shapes
- Frontend source code: `frontend/lib/types.ts`, `frontend/lib/api.ts`, `frontend/context/PriceContext.tsx` -- verified existing infrastructure

### Secondary (MEDIUM confidence)
- Recharts GitHub Treemap demo: https://github.com/recharts/recharts/blob/2.x/demo/component/Treemap.tsx -- data structure pattern
- Various React + Lightweight Charts integration guides confirmed the useRef/useEffect pattern

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Lightweight Charts v5 and Recharts v3 verified from official docs and npm
- Architecture: HIGH -- Patterns verified from official tutorials and existing codebase conventions
- Pitfalls: HIGH -- v5 migration pitfalls documented in official migration guide; memory leak pattern well-known
- API shapes: HIGH -- Verified directly from backend source code
- Type mismatches: HIGH -- Identified by comparing `lib/types.ts` against `routes/portfolio.py` source

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable libraries, 30-day validity)
