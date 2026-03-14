---
phase: 02-frontend-shell-streaming
plan: "01"
subsystem: ui
tags: [next.js, tailwind, typescript, jest, static-export]

# Dependency graph
requires:
  - phase: 01-backend-hardening
    provides: Backend API endpoints (watchlist, portfolio, trade, stream)
provides:
  - Next.js 14 project with static export build pipeline
  - Tailwind dark theme with terminal-* color tokens
  - Shared TypeScript interfaces for all frontend components
  - Number formatting helpers (price, change, currency)
  - Typed fetch wrappers for all backend API endpoints
  - Jest test runner configuration with next/jest
  - Price flash CSS animations (flash-green, flash-red, flash-none)
affects: [02-02-PLAN, 02-03-PLAN, 03-trading-portfolio-panels, 04-ai-chat-integration]

# Tech tracking
tech-stack:
  added: [next.js@14, react@18, tailwindcss@3, jest@30, @testing-library/react, @testing-library/jest-dom]
  patterns: [static-export, same-origin-api, terminal-theme, typed-api-wrappers]

key-files:
  created:
    - frontend/next.config.mjs
    - frontend/tailwind.config.ts
    - frontend/app/globals.css
    - frontend/app/layout.tsx
    - frontend/app/page.tsx
    - frontend/jest.config.ts
    - frontend/jest.setup.ts
    - frontend/lib/types.ts
    - frontend/lib/format.ts
    - frontend/lib/api.ts
  modified:
    - frontend/package.json

key-decisions:
  - "next.config.mjs instead of .ts — Next.js 14 does not support TypeScript config files"
  - "setupFilesAfterEnv (not setupFilesAfterFramework) — plan had incorrect Jest property name"
  - "Jest --passWithNoTests flag added — Jest exits 1 by default with no test files"

patterns-established:
  - "terminal-* color tokens: bg, surface, border, text, muted, yellow, blue, purple, green, red"
  - "apiFetch<T> typed wrapper pattern for all backend API calls"
  - "Price flash CSS classes: flash-green, flash-red, flash-none with 500ms transitions"

requirements-completed: [DISP-01, DISP-02, DISP-04, DISP-05]

# Metrics
duration: 6min
completed: 2026-03-14
---

# Phase 02 Plan 01: Frontend Scaffold Summary

**Next.js 14 static export with Tailwind terminal theme, shared TypeScript types, format helpers, and typed API wrappers**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-14T14:06:23Z
- **Completed:** 2026-03-14T14:13:17Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Next.js 14 project scaffolded from scratch with static export producing `frontend/out/`
- Tailwind CSS configured with full terminal dark theme (10 color tokens) and price flash animations
- All shared TypeScript interfaces defined (PriceUpdate, WatchlistEntry, PortfolioSummary, Position, ConnectionStatus, ChatMessage, ChatActions, PortfolioSnapshot)
- Typed API fetch wrappers created for all backend endpoints (watchlist, portfolio, trade)
- Number formatting helpers for prices, changes, currency, and quantities
- Jest configured with next/jest and testing-library for component testing

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project with static export and Tailwind dark theme** - `3456e4d` (feat)
2. **Task 2: Create shared types, format helpers, and API wrappers** - `5917d55` (feat)

## Files Created/Modified
- `frontend/next.config.mjs` - Static export configuration with unoptimized images and trailing slash
- `frontend/tailwind.config.ts` - Custom dark theme with terminal-* color tokens and mono font stack
- `frontend/app/globals.css` - Tailwind directives plus price flash animations (green/red/none)
- `frontend/app/layout.tsx` - Root layout with terminal-bg background and mono font
- `frontend/app/page.tsx` - Placeholder page using terminal theme colors
- `frontend/jest.config.ts` - Jest configuration using next/jest with jsdom environment
- `frontend/jest.setup.ts` - Testing library jest-dom setup
- `frontend/lib/types.ts` - All shared TypeScript interfaces (8 types exported)
- `frontend/lib/format.ts` - Number formatting helpers (5 functions exported)
- `frontend/lib/api.ts` - Typed fetch wrappers for all backend API endpoints (6 functions exported)
- `frontend/package.json` - Project config with test script and dependencies
- `frontend/tsconfig.json` - TypeScript strict mode configuration
- `frontend/postcss.config.mjs` - PostCSS with Tailwind plugin
- `frontend/.eslintrc.json` - ESLint with next config

## Decisions Made
- **next.config.mjs instead of .ts**: Next.js 14 does not support TypeScript config files (that feature was added in Next.js 15). Used `.mjs` with JSDoc type annotation instead.
- **setupFilesAfterEnv**: The plan repeatedly specified `setupFilesAfterFramework` which is not a valid Jest property. The correct property is `setupFilesAfterEnv`.
- **--passWithNoTests**: Added to Jest test script because Jest exits with code 1 when no test files exist, and the plan requires `npm test` to exit 0 with zero test files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] next.config.mjs instead of next.config.ts**
- **Found during:** Task 1 (Scaffold Next.js project)
- **Issue:** Plan specified `next.config.ts` but Next.js 14 errors with "Configuring Next.js via 'next.config.ts' is not supported"
- **Fix:** Used `next.config.mjs` with JSDoc type annotation instead
- **Files modified:** frontend/next.config.mjs
- **Verification:** `npm run build` succeeds, static export in out/
- **Committed in:** 3456e4d (Task 1 commit)

**2. [Rule 1 - Bug] setupFilesAfterEnv instead of setupFilesAfterFramework**
- **Found during:** Task 1 (Jest configuration)
- **Issue:** Plan specified `setupFilesAfterFramework` which is not a valid Jest property
- **Fix:** Used the correct property name `setupFilesAfterEnv`
- **Files modified:** frontend/jest.config.ts
- **Verification:** `npm test -- --watchAll=false` exits 0
- **Committed in:** 3456e4d (Task 1 commit)

**3. [Rule 1 - Bug] Added --passWithNoTests to Jest script**
- **Found during:** Task 1 (Jest verification)
- **Issue:** Jest exits with code 1 when no test files exist
- **Fix:** Added `--passWithNoTests` flag to the test script in package.json
- **Files modified:** frontend/package.json
- **Verification:** `npm test -- --watchAll=false` exits 0
- **Committed in:** 3456e4d (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs in plan specification)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep. The plan had incorrect assumptions about Next.js 14 capabilities and Jest config property names.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Frontend scaffold complete with all types, helpers, and build pipeline ready
- Ready for Plan 02 (SSE streaming hook and price state management)
- Ready for Plan 03 (Layout shell, header, and connection status)
- All terminal-* Tailwind classes available for component development
- API wrapper functions ready for component integration

---
*Phase: 02-frontend-shell-streaming*
*Completed: 2026-03-14*
