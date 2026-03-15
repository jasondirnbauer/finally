---
phase: 03-trading-portfolio-visualization
plan: "01"
subsystem: ui
tags: [lightweight-charts, recharts, sparkline, svg, charting, typescript]

# Dependency graph
requires:
  - phase: 02-frontend-shell-streaming
    provides: "PriceContext with prices, priceHistory, selectedTicker; WatchlistRow component; Header component; Jest + RTL test infrastructure"
provides:
  - "Sparkline SVG polyline component for watchlist mini-charts"
  - "PriceChart component using Lightweight Charts v5 for main ticker chart"
  - "ChartPanel wrapper reading PriceContext and rendering PriceChart"
  - "Corrected TypeScript types matching actual backend API response shapes"
  - "fetchPortfolioHistory unwraps { snapshots } wrapper"
  - "executeTrade typed return as TradeResult"
  - "lightweight-charts and recharts installed as charting dependencies"
affects: [03-02, 03-03, 04-ai-chat-panel]

# Tech tracking
tech-stack:
  added: [lightweight-charts v5.1, recharts v3.8]
  patterns: [imperative-chart-via-useRef, svg-polyline-sparkline, jest-manual-mock-for-esm, lightweight-charts-mock]

key-files:
  created:
    - frontend/components/Sparkline.tsx
    - frontend/components/PriceChart.tsx
    - frontend/components/ChartPanel.tsx
    - frontend/__tests__/Sparkline.test.tsx
    - frontend/__tests__/PriceChart.test.tsx
    - frontend/__mocks__/lightweight-charts.ts
  modified:
    - frontend/lib/types.ts
    - frontend/lib/api.ts
    - frontend/components/Header.tsx
    - frontend/components/WatchlistRow.tsx
    - frontend/components/Watchlist.tsx
    - frontend/app/page.tsx
    - frontend/jest.config.ts
    - frontend/package.json

key-decisions:
  - "lightweight-charts manual Jest mock via moduleNameMapper -- ESM-only package cannot be resolved by Jest CJS loader"
  - "PriceChart receives data as props (not from context) -- enables reuse and testability; ChartPanel bridges context to props"
  - "Time axis hidden in PriceChart -- sequential integer indices are meaningless to users"
  - "Type renames (cash_balance->cash, pnl_pct->pnl_percent) applied as breaking changes with all consumers updated"

patterns-established:
  - "Imperative chart pattern: useRef for chart/series, useEffect for create/cleanup, separate useEffect for data updates"
  - "SVG sparkline pattern: min/max normalization, inverted Y axis, polyline points string"
  - "ESM-only dependency testing: manual mock in __mocks__/ + moduleNameMapper in jest.config.ts"

requirements-completed: [CHART-01, DISP-03]

# Metrics
duration: 12min
completed: 2026-03-15
---

# Phase 3 Plan 01: Charting Foundation + Sparklines Summary

**Lightweight Charts v5 main price chart and SVG sparkline mini-charts with corrected TypeScript types matching backend API shapes**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-15T01:16:11Z
- **Completed:** 2026-03-15T01:28:00Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Installed lightweight-charts v5 and recharts v3 as charting dependencies
- Fixed frontend TypeScript types to match actual backend API response shapes (Position.pnl_percent, PortfolioSummary.cash, market_value, total_market_value, unrealized_pnl)
- Fixed fetchPortfolioHistory to unwrap { snapshots } wrapper and typed executeTrade return
- Built Sparkline SVG polyline component rendered in each WatchlistRow with progressive fill-in from SSE data
- Built PriceChart component using Lightweight Charts v5 imperative API with ResizeObserver, cleanup, and data updates via refs
- Created ChartPanel wrapper and replaced page.tsx placeholder with live chart
- Added 17 new tests (8 Sparkline + 9 PriceChart), all 31 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix type mismatches, install charting deps, build Sparkline** - `f3a55f9` (feat)
2. **Task 2: Build PriceChart with Lightweight Charts v5** - `b6c53a0` (feat)

## Files Created/Modified
- `frontend/components/Sparkline.tsx` - SVG polyline sparkline with min/max normalization
- `frontend/components/PriceChart.tsx` - Lightweight Charts v5 line chart with imperative API
- `frontend/components/ChartPanel.tsx` - Context-to-props bridge for PriceChart
- `frontend/__tests__/Sparkline.test.tsx` - 8 tests for sparkline rendering
- `frontend/__tests__/PriceChart.test.tsx` - 9 tests for chart lifecycle
- `frontend/__mocks__/lightweight-charts.ts` - Manual mock for ESM-only package
- `frontend/lib/types.ts` - Fixed Position and PortfolioSummary to match API
- `frontend/lib/api.ts` - Fixed fetchPortfolioHistory unwrap, typed executeTrade
- `frontend/components/Header.tsx` - Updated to use portfolio.cash
- `frontend/components/WatchlistRow.tsx` - Added priceHistory prop and Sparkline column
- `frontend/components/Watchlist.tsx` - Passes priceHistory from PriceContext
- `frontend/app/page.tsx` - Replaced ChartAreaPlaceholder with ChartPanel
- `frontend/jest.config.ts` - Added moduleNameMapper for lightweight-charts
- `frontend/package.json` - Added lightweight-charts and recharts dependencies

## Decisions Made
- Used manual Jest mock for lightweight-charts (ESM-only package, no CJS export, Jest CJS resolver cannot resolve it)
- PriceChart receives data as props rather than reading from context directly -- improves testability and reusability; ChartPanel bridges the gap
- Hid the time axis in PriceChart since the X values are sequential integers with no temporal meaning
- Applied breaking type renames (cash_balance to cash, pnl_pct to pnl_percent) and updated all consumers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Lightweight Charts Time type cast**
- **Found during:** Task 2 (PriceChart build)
- **Issue:** TypeScript build failed because `number` is not assignable to Lightweight Charts `Time` type
- **Fix:** Cast integer index as `unknown as Time` to satisfy the type system while using sequential integers
- **Files modified:** frontend/components/PriceChart.tsx
- **Verification:** `npm run build` exits 0
- **Committed in:** b6c53a0

**2. [Rule 2 - Missing Critical] Created ChartPanel wrapper component**
- **Found during:** Task 2 (PriceChart page integration)
- **Issue:** page.tsx needed a client component to bridge PriceContext data to PriceChart props
- **Fix:** Created ChartPanel.tsx that reads selectedTicker and priceHistory from usePriceContext()
- **Files modified:** frontend/components/ChartPanel.tsx, frontend/app/page.tsx
- **Verification:** Build succeeds, PriceChart renders with context data
- **Committed in:** b6c53a0

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- lightweight-charts is ESM-only (no CJS exports), causing `jest.mock()` to fail with module resolution error -- resolved by creating a manual mock file and using moduleNameMapper

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Charting infrastructure (lightweight-charts + recharts) installed and tested
- Types corrected for all backend API shapes -- Plan 02 (PositionsTable, TradeBar) and Plan 03 (PortfolioHeatmap, PnlChart) can use them directly
- Sparklines rendering in watchlist, PriceChart rendering for selected ticker
- 31 tests passing, static export building successfully

---
*Phase: 03-trading-portfolio-visualization*
*Completed: 2026-03-15*
