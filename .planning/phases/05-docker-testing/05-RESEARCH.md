# Phase 5: Docker + Testing - Research

**Researched:** 2026-03-16
**Domain:** Docker containerization, Playwright E2E testing, pytest/Jest unit testing
**Confidence:** HIGH

## Summary

Phase 5 is a **validation and completion phase**, not a greenfield build. The Dockerfile, docker-compose files, start/stop scripts, backend tests (21+ files), frontend tests (14 files), and Playwright E2E specs (5 files) all already exist. The primary work is: (1) verifying the Docker build actually succeeds end-to-end, (2) fixing any build/runtime issues discovered, (3) ensuring all existing tests pass, (4) filling any test coverage gaps needed to satisfy the INFRA-04/INFRA-05 requirements, and (5) validating E2E tests run against the containerized app.

The existing infrastructure is well-structured. The multi-stage Dockerfile follows standard patterns (Node 20 slim -> Python 3.12 slim with uv). Playwright 1.58.2 is pinned with tests targeting `http://localhost:8000`. The docker-compose.test.yml runs the app with `LLM_MOCK=true` and a health check. Backend tests use pytest-asyncio with httpx AsyncClient. Frontend tests use Jest 30 + React Testing Library. The main risk is integration -- things that work individually may fail when composed (e.g., the frontend build output path, static file mounting, SQLite volume permissions).

**Primary recommendation:** Build the Docker image first and validate it serves the app. Then run existing test suites to identify failures. Fix issues iteratively. Finally, execute Playwright E2E tests against the running container. The existing test specs are comprehensive and cover all success criteria.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None -- all implementation decisions are at Claude's discretion.

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
- `docker-compose.test.yml` already exists -- use it for containerized test runs
- `LLM_MOCK=true` for deterministic chat responses in E2E
- Fresh database per test run (no leftover state)

**Test coverage gaps (if any):**
- Review existing backend and frontend test suites
- Fill any gaps needed to satisfy INFRA-04 and INFRA-05 requirements
- Focus on: trade execution edge cases, P&L calculation, LLM structured output parsing, API response shapes
- Frontend: watchlist, price flash, trade bar validation, portfolio display

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Multi-stage Dockerfile -- Node 20 builds frontend static export, Python 3.12 serves via FastAPI | Dockerfile already exists at project root. Multi-stage pattern correct (node:20-slim -> python:3.12-slim + uv). Needs build verification and potential fixes. |
| INFRA-02 | Start/stop scripts for macOS/Linux (bash) and Windows (PowerShell) | All four scripts exist in `scripts/`. start_mac.sh, stop_mac.sh, start_windows.ps1, stop_windows.ps1. Need functional validation. |
| INFRA-03 | Playwright E2E tests in test/ directory with docker-compose.test.yml | 5 E2E spec files exist in `test/e2e/`. Playwright 1.58.2 configured. docker-compose.test.yml exists with health check. Need execution validation. |
| INFRA-04 | Backend unit tests (pytest) for portfolio, chat, and API routes | 21+ pytest files exist covering DB, market, routes (portfolio, watchlist, chat, health), services (trade_service), LLM (models, mock, service). Coverage appears comprehensive for all required areas. |
| INFRA-05 | Frontend unit tests for key components | 14 Jest test files covering all 14 components: Watchlist, WatchlistRow, Sparkline, PriceChart, ChartPanel, TradeBar, PositionsTable, PortfolioHeatmap, PnlChart, ChatMessage, ChatInput, ChatActionCard, ChatPanel, Header. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Docker | 29.2.1+ | Container runtime | Industry standard, installed on dev machine |
| node:20-slim | 20.x | Frontend build stage | Matches project's Node version, slim reduces image size |
| python:3.12-slim | 3.12.x | Backend runtime stage | Matches project's Python version, slim ~45MB base |
| uv | latest (via ghcr.io/astral-sh/uv) | Python dependency management | Project standard, fast installs via `--frozen` |
| Playwright | 1.58.2 | E2E browser testing | Already pinned in test/package.json |
| pytest | 8.3+ | Backend unit testing | Already configured in pyproject.toml |
| pytest-asyncio | 0.24+ | Async test support | Already configured, `asyncio_mode = "auto"` |
| Jest | 30.3+ | Frontend unit testing | Already configured via next/jest |
| React Testing Library | 16.3+ | Component testing | Already in devDependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| httpx | 0.28+ | Backend route test HTTP client | Already used in route conftest.py for ASGITransport |
| @testing-library/jest-dom | 6.9+ | Jest DOM matchers | Already in frontend devDependencies |
| docker-compose | v2 (built-in) | Multi-service orchestration | For test execution via docker-compose.test.yml |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | Cypress | Playwright already configured and specs written; no reason to switch |
| Jest | Vitest | Jest already configured with 14 test files; migration would be scope creep |
| docker-compose.test.yml | Manual docker run | Compose provides health checks and cleaner lifecycle |

## Architecture Patterns

### Existing Docker Architecture
```
Dockerfile (multi-stage)
├── Stage 1: node:20-slim
│   ├── COPY frontend/package*.json
│   ├── npm ci
│   ├── COPY frontend/
│   └── npm run build          -> produces frontend/out/
│
└── Stage 2: python:3.12-slim
    ├── COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx
    ├── COPY backend/pyproject.toml + uv.lock + README.md
    ├── uv sync --frozen --no-dev
    ├── COPY backend/
    ├── COPY --from=frontend-build frontend/out -> static/
    ├── mkdir -p /app/db
    └── CMD: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Test Infrastructure Architecture
```
test/
├── package.json               # @playwright/test ^1.58.2
├── package-lock.json          # Locked to 1.58.2
├── playwright.config.ts       # baseURL: http://localhost:8000
├── docker-compose.test.yml    # App container with LLM_MOCK=true
└── e2e/
    ├── fresh-start.spec.ts    # 5 tests: watchlist, balance, streaming, status, branding
    ├── watchlist.spec.ts      # 2 tests: add ticker, remove ticker
    ├── trading.spec.ts        # 2 tests: buy shares, sell shares
    ├── portfolio.spec.ts      # 3 tests: P&L chart, heatmap/positions, data after trade
    └── chat.spec.ts           # 2 tests: send/receive message, portfolio analysis
```

### Pattern 1: Docker Build -> Validate -> Test Flow
**What:** Sequential workflow: build image, start container, wait for health, run tests, stop container
**When to use:** Every time you want to validate the full stack
**Example:**
```bash
# 1. Build the Docker image
docker build -t finally .

# 2. Start with test compose
cd test && docker compose -f docker-compose.test.yml up -d

# 3. Wait for health check
until curl -sf http://localhost:8000/api/health; do sleep 1; done

# 4. Run Playwright tests
npx playwright test

# 5. Teardown
docker compose -f docker-compose.test.yml down
```

### Pattern 2: Backend Test Isolation with tmp_path
**What:** Each test gets its own SQLite database via `set_db_path(tmp_path / "test.db")`
**When to use:** All backend tests to prevent cross-contamination
**Example:**
```python
# Source: backend/tests/routes/conftest.py
@pytest.fixture
async def test_db(tmp_path):
    db_path = str(tmp_path / "test.db")
    set_db_path(db_path)
    await init_db()
    yield db_path
    set_db_path(str(tmp_path / "unused.db"))
```

### Pattern 3: E2E Tests Use API for Setup, UI for Assertion
**What:** Some E2E tests call `page.request.post("/api/portfolio/trade")` to set up state, then navigate to verify UI
**When to use:** When setting up test state through the UI would be slow/fragile
**Example:**
```typescript
// Source: test/e2e/portfolio.spec.ts
const res = await page.request.post("/api/portfolio/trade", {
  data: { ticker: "MSFT", side: "buy", quantity: 3 },
});
expect(res.ok()).toBeTruthy();
await page.goto("/");
```

### Anti-Patterns to Avoid
- **Running E2E tests against dev server:** Always test against the Docker container to match production
- **Sharing database state between E2E tests:** Tests should either use fresh state or be ordered carefully (current specs run `fullyParallel: false`)
- **Hardcoding prices in E2E assertions:** Simulator prices drift; assert patterns like `$X.XX` not exact values
- **Using `page.waitForTimeout()` as sole synchronization:** Prefer `expect().toBeVisible({ timeout })` -- though some existing tests use waitForTimeout for portfolio refresh, which is acceptable for polling-based updates

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker health checks | Custom polling scripts | docker-compose healthcheck directive | Already in docker-compose.test.yml with proper retry logic |
| Playwright browser install | Manual browser download | `npx playwright install chromium` | Handles platform-specific binaries correctly |
| Test database cleanup | Manual DELETE statements | pytest tmp_path fixture + set_db_path | Already implemented pattern, fresh DB per test |
| SSE connection testing | Custom EventSource mock | Playwright's built-in page waiting | `page.getByText("Live").toBeVisible()` already validates SSE |
| E2E test parallelization | Custom test runner | Playwright's `fullyParallel` config | Set to `false` because tests share DB state |

**Key insight:** Nearly all infrastructure is already built. The work is verification, fixing, and gap-filling -- not creation.

## Common Pitfalls

### Pitfall 1: Frontend Build Fails in Docker Due to Missing Dependencies
**What goes wrong:** `npm ci` succeeds locally but fails in Docker because of platform-specific native modules or missing system libraries
**Why it happens:** node:20-slim lacks some C compilation tools; lightweight-charts and recharts are pure JS but other deps might not be
**How to avoid:** Run `docker build` early. If it fails at `npm run build`, check for missing native deps. The existing Dockerfile uses `npm ci` (not `npm install`) which is correct for reproducible builds.
**Warning signs:** Build errors mentioning `node-gyp`, `canvas`, or `sharp`

### Pitfall 2: uv sync Fails Due to Missing README.md
**What goes wrong:** hatchling build backend requires README.md to exist
**Why it happens:** The COPY line for README.md must come before `uv sync`
**How to avoid:** The existing Dockerfile already handles this: `COPY backend/pyproject.toml backend/uv.lock backend/README.md ./`
**Warning signs:** `FileNotFoundError` or `hatchling` error during `uv sync`

### Pitfall 3: Static Files Not Served Because Directory Missing
**What goes wrong:** FastAPI's `StaticFiles` mount is conditional (`if _static_dir.is_dir()`), so if the frontend build output isn't copied correctly, the app starts but serves only API routes
**Why it happens:** Path mismatch between COPY destination and FastAPI's static dir lookup
**How to avoid:** Verify `COPY --from=frontend-build /app/frontend/out ./static/` produces files at `backend/static/`. The FastAPI code looks for `Path(__file__).parent.parent / "static"` which resolves to `/app/backend/../static` -> `/app/static` -- THIS IS A POTENTIAL ISSUE. The Dockerfile copies to `/app/backend/static/` but the code resolves to `/app/static`.
**Warning signs:** App starts but browser shows 404 on `/`

### Pitfall 4: SQLite Volume Permissions on Different OS
**What goes wrong:** SQLite database can't be created or written to inside the container
**Why it happens:** Volume mount permissions differ between Docker Desktop on Mac/Windows and Linux Docker
**How to avoid:** The `mkdir -p /app/db` in the Dockerfile helps. For compose, the volume is a named volume (`finally-data`) which Docker manages. For test compose, there's no volume defined which means ephemeral storage (good for tests).
**Warning signs:** `sqlite3.OperationalError: unable to open database file`

### Pitfall 5: Playwright Browser Not Installed
**What goes wrong:** `npx playwright test` fails with "Executable doesn't exist" error
**Why it happens:** Playwright 1.58.2 needs browser binaries installed via `npx playwright install chromium`
**How to avoid:** After `npm install` in the test directory, run `npx playwright install --with-deps chromium`. The `--with-deps` flag installs system dependencies on Linux.
**Warning signs:** Error messages about missing browser binaries or system libraries

### Pitfall 6: E2E Tests Fail Because Container Not Ready
**What goes wrong:** Playwright connects before the app is fully initialized (DB seeded, market data started)
**Why it happens:** Health check passes (`/api/health` returns ok) but the app isn't fully ready
**How to avoid:** The docker-compose.test.yml has a healthcheck with `interval: 2s, retries: 10`. E2E tests use generous timeouts (15s) for initial page load. The `fresh-start.spec.ts` waits for `AAPL` to be visible.
**Warning signs:** Flaky first test, subsequent tests pass

### Pitfall 7: Static File Path Resolution Issue
**What goes wrong:** The `_static_dir` in `main.py` resolves relative to the file location: `Path(__file__).parent.parent / "static"`. Since `__file__` is at `/app/backend/app/main.py`, `.parent.parent` is `/app/backend/`, so `_static_dir` = `/app/backend/static/`. The Dockerfile COPY puts files at `./static/` which relative to WORKDIR `/app/backend` = `/app/backend/static/`. This SHOULD be correct.
**How to avoid:** Verify the path resolves correctly inside the container with `docker exec` after startup.
**Warning signs:** 404 on the root URL

### Pitfall 8: E2E Tests Share Database State
**What goes wrong:** Tests run in sequence (fullyParallel: false) and earlier tests' side effects (trades, watchlist changes) affect later tests
**Why it happens:** The containerized app uses a single SQLite database for the entire test run
**How to avoid:** Tests should be written to either (a) not depend on clean state, or (b) use API calls to reset state. Current tests appear to handle this -- they use API setup calls and check for conditional state (e.g., `heatmapEmpty.or(heatmapHeading)`).
**Warning signs:** Tests pass individually but fail when run together

## Code Examples

### Docker Build and Run
```bash
# Build the image
docker build -t finally .

# Run with .env file and volume
docker run -d --name finally -p 8000:8000 -v finally-data:/app/db --env-file .env finally

# Verify health
curl http://localhost:8000/api/health
# Expected: {"status":"ok"}

# Verify static files
curl -s http://localhost:8000/ | head -5
# Expected: HTML content
```

### Running Backend Tests
```bash
# From backend directory
cd backend
uv sync --extra dev
uv run --extra dev pytest -v
uv run --extra dev pytest --cov=app  # With coverage
```

### Running Frontend Tests
```bash
# From frontend directory
cd frontend
npm test
# Or with coverage
npx jest --coverage
```

### Running E2E Tests
```bash
# 1. Build the Docker image
docker build -t finally .

# 2. Start test container
cd test
docker compose -f docker-compose.test.yml up -d --wait

# 3. Install Playwright browsers (first time)
npm install
npx playwright install --with-deps chromium

# 4. Run tests
npx playwright test

# 5. Teardown
docker compose -f docker-compose.test.yml down
```

### docker-compose.test.yml Execution
```yaml
# Source: test/docker-compose.test.yml
services:
  app:
    image: finally          # Pre-built image
    ports:
      - "8000:8000"
    environment:
      - LLM_MOCK=true       # Deterministic mock responses
      - OPENROUTER_API_KEY=test  # Dummy key (not used with mock)
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 2s
      timeout: 5s
      retries: 10
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pip + requirements.txt in Docker | uv sync --frozen | 2024-2025 | 10-100x faster installs, lockfile reproducibility |
| WebSocket for E2E testing | Playwright built-in EventSource support | Native | SSE testing is straightforward with page assertions |
| Manual browser download in CI | `npx playwright install --with-deps` | Playwright 1.40+ | System deps auto-installed |
| docker-compose v1 | docker compose v2 (built-in) | 2023 | No separate install needed, `docker compose` command |

**Deprecated/outdated:**
- `docker-compose` (hyphenated binary): Use `docker compose` (space-separated, built into Docker CLI)
- `--link` flag: Use docker-compose networks instead
- Playwright `webServer` config for Docker: Not needed since we start the container separately

## Open Questions

1. **Static file path resolution in container**
   - What we know: `main.py` uses `Path(__file__).parent.parent / "static"`, which should resolve to `/app/backend/static/`. Dockerfile copies to `./static/` from WORKDIR `/app/backend`.
   - What's unclear: Whether this works correctly in practice (path resolution with uv run)
   - Recommendation: Build the image and verify with `docker exec finally ls /app/backend/static/`

2. **E2E test isolation / database state**
   - What we know: Tests run sequentially (fullyParallel: false), some use API calls for setup
   - What's unclear: Whether the database-compose.test.yml container gets a fresh DB per run (it should since no volume is defined)
   - Recommendation: Verify by running tests twice in sequence without rebuilding

3. **Backend test runner availability**
   - What we know: Backend uses `uv run --extra dev pytest` but uv isn't installed on the Windows host (based on the "did not find executable" error)
   - What's unclear: Whether backend tests can be run locally or only in container
   - Recommendation: Ensure uv is installed locally, or document container-based test execution

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend Framework | pytest 8.3+ with pytest-asyncio 0.24+ (async auto mode) |
| Frontend Framework | Jest 30.3 with React Testing Library 16.3+ |
| E2E Framework | Playwright 1.58.2 (Chromium only) |
| Backend Config | `backend/pyproject.toml` [tool.pytest.ini_options] |
| Frontend Config | `frontend/jest.config.ts` |
| E2E Config | `test/playwright.config.ts` |
| Backend Quick Run | `cd backend && uv run --extra dev pytest -v` |
| Frontend Quick Run | `cd frontend && npm test` |
| E2E Quick Run | `cd test && npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Docker build succeeds, app serves on port 8000 | integration | `docker build -t finally . && docker run --rm -d -p 8000:8000 --name finally-test finally && sleep 5 && curl -sf http://localhost:8000/api/health && docker stop finally-test` | Manual validation |
| INFRA-02 | Start/stop scripts work | integration | `bash scripts/start_mac.sh && curl -sf http://localhost:8000/api/health && bash scripts/stop_mac.sh` | Manual validation |
| INFRA-03 | Playwright E2E tests pass | e2e | `cd test && npx playwright test` | Yes -- 5 spec files with 14 tests |
| INFRA-04 | Backend pytest suite passes | unit | `cd backend && uv run --extra dev pytest -v` | Yes -- 21+ test files |
| INFRA-05 | Frontend Jest suite passes | unit | `cd frontend && npm test` | Yes -- 14 test files |

### E2E Test Coverage Detail
| Spec File | Tests | Success Criteria Coverage |
|-----------|-------|--------------------------|
| fresh-start.spec.ts | 5 | Default watchlist (10 tickers), $10k balance, prices streaming, connection status, branding |
| watchlist.spec.ts | 2 | Add ticker (PYPL), remove ticker (NFLX) |
| trading.spec.ts | 2 | Buy shares (cash decreases, position appears), sell shares (cash increases) |
| portfolio.spec.ts | 3 | P&L chart renders, heatmap/positions render, positions table shows data after trade |
| chat.spec.ts | 2 | Send message + receive response, portfolio analysis response |

### Backend Test Coverage Detail
| Test Area | Files | Coverage |
|-----------|-------|----------|
| Trade execution + edge cases | test_trade_service.py (11 tests), test_portfolio.py (10 tests) | Buy, sell, insufficient cash, insufficient shares, no price, avg cost update, sell all, zero qty, invalid side |
| P&L calculation | test_portfolio.py (portfolio with positions, unrealized P&L), test_trade_service.py (snapshot after trade) | Position market value, unrealized P&L, portfolio total value |
| LLM structured output parsing | test_models.py (5 tests) | Message only, with trades, with watchlist changes, JSON parsing, minimal JSON |
| API response shapes | test_health.py, test_portfolio.py, test_watchlist.py, test_chat.py | All endpoint status codes and response JSON structures |
| Database layer | test_db.py (18 tests) | Init, cash, watchlist, positions, trades, snapshots, chat messages |
| LLM mock mode | test_mock.py (9 tests) | Greeting, buy/sell parsing, portfolio analysis, watch/unwatch |
| LLM service integration | test_service.py (11 tests) | Context building, action execution (buy/sell/watchlist), chat flow |

### Frontend Test Coverage Detail
| Test Area | Files | Coverage |
|-----------|-------|----------|
| Watchlist component | Watchlist.test.tsx (3 tests) | Renders tickers, click selects ticker, highlight styling |
| Price flash animation | WatchlistRow.test.tsx (5 tests) | Flash-green on uptick, flash-red on downtick, removes after 500ms, re-triggers on timestamp |
| Trade bar validation | TradeBar.test.tsx (10 tests) | Renders inputs/buttons, buy/sell calls, loading state, validation errors (empty, zero qty), API error display, input clearing, portfolio refresh |
| Portfolio display | PositionsTable.test.tsx, PortfolioHeatmap.test.tsx, PnlChart.test.tsx | Positions rendering, heatmap rendering, P&L chart rendering |
| Chat components | ChatMessage.test.tsx, ChatInput.test.tsx, ChatActionCard.test.tsx, ChatPanel.test.tsx | Message rendering, input handling, action cards, panel integration |
| Other components | Header.test.tsx, PriceChart.test.tsx, ChartPanel.test.tsx, Sparkline.test.tsx | Header stats, chart rendering, sparkline rendering |

### Sampling Rate
- **Per task commit:** Run relevant test suite (backend or frontend) based on changed files
- **Per wave merge:** Full backend + frontend test suites
- **Phase gate:** Docker build + all three test suites green (backend pytest, frontend Jest, Playwright E2E)

### Wave 0 Gaps
- [ ] Verify Docker build succeeds -- no automated test exists, must be validated during execution
- [ ] Verify `npx playwright install --with-deps chromium` is run before E2E tests
- [ ] Verify backend tests run successfully (uv must be available locally)
- [ ] Verify frontend tests run successfully (node_modules must be up to date)

*(Test infrastructure itself is complete. Gaps are execution/environment verification, not missing test files.)*

## Sources

### Primary (HIGH confidence)
- Project codebase: Dockerfile, docker-compose.yml, docker-compose.test.yml, all test files -- read directly
- [Playwright Docker docs](https://playwright.dev/docs/docker) - Official image names, recommended flags (--init, --ipc=host)
- [uv Docker guide](https://docs.astral.sh/uv/guides/integration/docker/) - uv sync patterns, environment variables, multi-stage builds

### Secondary (MEDIUM confidence)
- [Playwright CI docs](https://playwright.dev/docs/ci) - Browser caching not recommended, use install --with-deps
- [Playwright best practices 2026](https://www.browserstack.com/guide/playwright-best-practices) - API setup for test data, test isolation

### Tertiary (LOW confidence)
- None -- all findings verified from codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured in the project
- Architecture: HIGH - Dockerfile, compose files, and test infrastructure already built and reviewed
- Pitfalls: HIGH - Based on direct code analysis of actual file paths, Docker patterns, and test structure
- Test coverage: HIGH - Every test file read and catalogued

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable infrastructure, no fast-moving dependencies)
