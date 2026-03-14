---
phase: 02-frontend-shell-streaming
plan: "03"
subsystem: ui
tags: [react, tailwind, sse, flash-animation, price-display, connection-status, tdd]

# Dependency graph
requires:
  - phase: 02-frontend-shell-streaming/01
    provides: "Next.js scaffold with types, API wrappers, Tailwind dark theme tokens"
  - phase: 02-frontend-shell-streaming/02
    provides: "usePriceStream SSE hook, PriceContext, terminal shell page layout"
provides:
  - "Header component with connection status dot, portfolio value, and cash balance"
  - "Watchlist component rendering all tickers with live price, change, changePct"
  - "WatchlistRow component with flash-green/red animation keyed on SSE timestamp"
  - "Ticker selection via click with visible highlight styling"
affects: [03-trading-portfolio-panels, 04-ai-chat-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green workflow, useEffect flash animation with timestamp key, data-testid for test hooks]

key-files:
  created:
    - frontend/components/Header.tsx
    - frontend/components/Watchlist.tsx
    - frontend/components/WatchlistRow.tsx
    - frontend/__tests__/Header.test.tsx
    - frontend/__tests__/Watchlist.test.tsx
    - frontend/__tests__/WatchlistRow.test.tsx
  modified:
    - frontend/app/page.tsx
    - frontend/jest.config.ts

key-decisions:
  - "Flash animation keyed on update?.timestamp (not price) so identical prices still trigger visual feedback"
  - "moduleNameMapper added to jest.config.ts to resolve @/ path alias in Jest 30"
  - "WatchlistRow uses data-ticker and data-selected attributes for testability and semantic markup"

patterns-established:
  - "TDD component workflow: write failing tests with mocked context, then implement component to pass"
  - "Flash animation pattern: useState + useEffect on timestamp, setTimeout to clear after 500ms"
  - "Connection dot pattern: Record<ConnectionStatus, string> mapping to Tailwind bg classes"

requirements-completed: [DISP-01, DISP-02, DISP-04, DISP-05]

# Metrics
duration: 15min
completed: 2026-03-14
---

# Phase 02 Plan 03: Header and Watchlist Components Summary

**Header with connection status dot and portfolio display, Watchlist with live price flash animations (green/red) keyed on SSE timestamp**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-14T17:28:10Z
- **Completed:** 2026-03-14T17:43:35Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Header component displays portfolio total value and cash balance from PriceContext, with em-dash placeholder when loading
- Connection status dot: green (connected), yellow with pulse animation (reconnecting), red (disconnected)
- Watchlist renders all tickers from context with current price, change amount, and change percentage
- Flash animation triggers on every SSE update keyed on timestamp (not price value), fades after 500ms
- Click-to-select ticker with visible ring highlight and blue tint background
- 14 unit tests across 3 test suites, all passing with TDD workflow

## Task Commits

Each task was committed atomically (TDD: test then implementation):

1. **Task 1: Header component** - `b7377c8` (test: RED) + `c8214f1` (feat: GREEN)
2. **Task 2: Watchlist + WatchlistRow** - `5c3ac7d` (test: RED) + `1d3ff38` (feat: GREEN)

## Files Created/Modified
- `frontend/components/Header.tsx` - Fixed header with branding, portfolio value, cash balance, connection status dot
- `frontend/components/Watchlist.tsx` - Watchlist panel listing all tickers from PriceContext with column headers
- `frontend/components/WatchlistRow.tsx` - Individual row with flash animation (useEffect on timestamp), price/change display
- `frontend/__tests__/Header.test.tsx` - 6 tests: branding, connection dot colors, portfolio display, null placeholder
- `frontend/__tests__/Watchlist.test.tsx` - 3 tests: renders tickers, click selection, highlight styling
- `frontend/__tests__/WatchlistRow.test.tsx` - 5 tests: render, flash-green, flash-red, 500ms fade, timestamp re-trigger
- `frontend/app/page.tsx` - Replaced Header and Watchlist placeholders with real component imports
- `frontend/jest.config.ts` - Added moduleNameMapper for @/ path alias resolution

## Decisions Made
- Flash animation keyed on `update?.timestamp` (not `update?.price`) so identical consecutive prices still trigger visual feedback on each SSE event
- Added `moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }` to jest.config.ts because next/jest did not auto-resolve the @/ alias in Jest 30
- WatchlistRow uses `data-ticker` and `data-selected` HTML attributes for testability and semantic accessibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Jest @/ path alias not resolved**
- **Found during:** Task 1 (Header test RED phase)
- **Issue:** `jest.mock('@/context/PriceContext')` failed with "Cannot find module" because next/jest did not configure moduleNameMapper for @/ alias
- **Fix:** Added `moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }` to jest.config.ts
- **Files modified:** frontend/jest.config.ts
- **Verification:** All tests resolve imports correctly
- **Committed in:** b7377c8 (Task 1 RED commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for test infrastructure. No scope creep.

## Issues Encountered
- Jest 30 uses `--testPathPatterns` (plural) instead of `--testPathPattern` (singular) from earlier versions. Adjusted test commands accordingly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Header and Watchlist are the last components in Phase 2; the frontend shell with live streaming is now complete
- Phase 3 (trading/portfolio panels) can build on top of PriceContext and the established component patterns
- Sparklines (DISP-03) deferred to Phase 3 as planned, leveraging price history data already accumulated by usePriceStream
- Static export build verified working with all new components

## Self-Check: PASSED

All 6 created files verified present. All 4 commit hashes verified in git log.

---
*Phase: 02-frontend-shell-streaming*
*Completed: 2026-03-14*
