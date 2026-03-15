# Phase 5: Docker + Testing - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate the existing Docker containerization and add Playwright E2E tests covering the critical user paths. The Dockerfile, docker-compose files, and start/stop scripts already exist — this phase ensures they work correctly and adds end-to-end test coverage. Backend (21+ test files) and frontend (14 test files) unit tests already exist and pass.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation decisions for this phase are at Claude's discretion, guided by PLAN.md spec and success criteria. Key areas:

**Docker build validation:**
- Verify the existing multi-stage Dockerfile builds successfully
- Fix any issues discovered during build (dependency versions, paths, etc.)
- Ensure the container starts and serves the app on port 8000
- Validate start/stop scripts work correctly on both platforms
- Volume mount for SQLite persistence should work across restarts

**E2E test scenarios (from success criteria):**
- Fresh start: default watchlist appears, $10k balance shown, prices are streaming
- Add and remove a ticker from the watchlist
- Buy shares: cash decreases, position appears, portfolio updates
- Sell shares: cash increases, position updates or disappears
- AI chat (mocked with LLM_MOCK=true): send a message, receive response, trade execution appears inline
- SSE connection: verify prices are streaming and updating

**Test infrastructure:**
- Playwright tests in `test/e2e/` directory
- `docker-compose.test.yml` already exists — use it for containerized test runs
- `LLM_MOCK=true` for deterministic chat responses in E2E
- Fresh database per test run (no leftover state)

**Test coverage gaps (if any):**
- Review existing backend and frontend test suites
- Fill any gaps needed to satisfy INFRA-04 and INFRA-05 requirements
- Focus on: trade execution edge cases, P&L calculation, LLM structured output parsing, API response shapes
- Frontend: watchlist, price flash, trade bar validation, portfolio display

</decisions>

<specifics>
## Specific Ideas

No specific requirements — user delegated all infrastructure decisions to Claude. Follow PLAN.md spec and success criteria. The goal is a user going from `git clone` to working app in under 5 minutes.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Dockerfile`: Multi-stage build (Node 20 → Python 3.12) already complete
- `docker-compose.yml`: Service with volume mount and env_file
- `docker-compose.test.yml`: Test-specific compose file exists in `test/`
- `scripts/`: start_mac.sh, stop_mac.sh, start_windows.ps1, stop_windows.ps1 all exist
- `test/playwright.config.ts`: Playwright configuration exists
- `test/e2e/`: E2E test directory exists
- Backend: 21+ pytest files covering market, routes, LLM, services, DB
- Frontend: 14 Jest test files covering all components

### Established Patterns
- Backend tests use pytest with httpx AsyncClient (see `tests/routes/conftest.py`)
- Frontend tests use Jest + React Testing Library with mock patterns
- `LLM_MOCK=true` env var for deterministic LLM responses
- Static export served by FastAPI from `backend/static/`

### Integration Points
- Dockerfile copies `frontend/out/` → `backend/static/` in build
- Container exposes port 8000, SQLite volume at `/app/db`
- `.env` file mounted via `--env-file` flag
- Playwright tests connect to `http://localhost:8000`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-docker-testing*
*Context gathered: 2026-03-15*
