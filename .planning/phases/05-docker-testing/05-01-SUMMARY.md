---
phase: 05-docker-testing
plan: 01
subsystem: infra
tags: [docker, multi-stage-build, pytest, jest, sqlite, fastapi, nextjs]

# Dependency graph
requires:
  - phase: 04-ai-chat
    provides: Complete frontend and backend application ready for containerization
provides:
  - Validated Docker image that builds and serves full app on port 8000
  - Green backend pytest suite (162 tests)
  - Green frontend Jest suite (101 tests, 14 test files)
  - Validated start/stop scripts for macOS/Linux and Windows
affects: [05-02 E2E testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rowid tiebreaker for same-timestamp ordering in SQLite queries"

key-files:
  created: []
  modified:
    - backend/app/db/repository.py

key-decisions:
  - "Added rowid DESC as secondary sort in chat history query to guarantee insertion-order for same-timestamp messages"

patterns-established:
  - "SQLite ordering: always add rowid as tiebreaker when ORDER BY timestamp to handle rapid inserts"

requirements-completed: [INFRA-01, INFRA-02, INFRA-04, INFRA-05]

# Metrics
duration: 14min
completed: 2026-03-16
---

# Phase 5 Plan 01: Docker Build Validation + Unit Test Suites Summary

**Multi-stage Docker image builds and serves API + static frontend on port 8000; 162 backend and 101 frontend tests all green after chat history ordering fix**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-16T22:39:36Z
- **Completed:** 2026-03-16T22:53:46Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Docker image builds successfully via multi-stage Dockerfile (Node 20 + Python 3.12) in under 60 seconds (cached layers)
- Container serves health API (`/api/health`), static Next.js frontend (`/`), and watchlist API (`/api/watchlist` with all 10 default tickers) on port 8000
- Backend pytest suite: 162/162 tests pass (after fixing 1 bug in chat history ordering)
- Frontend Jest suite: 101/101 tests pass across 14 test files (no changes needed)
- All 4 start/stop scripts reviewed and validated as correct (proper image name, volume name, env-file handling, browser open logic)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Docker image and validate container serves the app** - No file changes needed (Dockerfile, docker-compose.yml, all scripts validated as correct)
2. **Task 2: Run and fix backend pytest and frontend Jest test suites** - `7f3b1b0` (fix)

## Files Created/Modified
- `backend/app/db/repository.py` - Added rowid DESC tiebreaker to chat history query for deterministic ordering of same-timestamp messages

## Decisions Made
- Added `rowid DESC` as secondary sort key in `get_chat_history()` query -- when multiple chat messages share the same `created_at` timestamp (common in rapid-fire inserts), SQLite's default ordering is non-deterministic. Using rowid guarantees insertion order, which is the natural expectation for chat history.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Non-deterministic chat history ordering for same-timestamp messages**
- **Found during:** Task 2 (backend pytest suite)
- **Issue:** `get_chat_history()` ordered only by `created_at DESC`. When messages were inserted within the same millisecond (e.g., in a loop or rapid chat), the 5 most recent messages returned in arbitrary order. Test `test_chat_history_limit` expected Message 5 as first result but got Message 6.
- **Fix:** Added `rowid DESC` as secondary sort key: `ORDER BY created_at DESC, rowid DESC LIMIT ?`
- **Files modified:** backend/app/db/repository.py
- **Verification:** Test passes; full 162-test suite green
- **Committed in:** 7f3b1b0

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential correctness fix for chat history ordering. No scope creep.

## Issues Encountered
- Backend venv was pointing to a stale Anaconda Python path (`C:\ProgramData\anaconda3\python.exe`). Recreated venv with `uv venv --python 3.12` targeting the locally installed CPython 3.12.11.
- Docker Desktop was not running at execution start. Started it programmatically and waited for daemon readiness before proceeding with Docker build validation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Docker image builds and serves the full app -- ready for E2E testing in Plan 02
- All unit test suites green -- no pre-existing failures to interfere with E2E validation
- Container verified to serve static frontend, API endpoints, and SSE streaming infrastructure

---
*Phase: 05-docker-testing*
*Completed: 2026-03-16*
