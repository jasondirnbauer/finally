# Research Summary: FinAlly - AI Trading Workstation

**Domain:** AI-powered simulated trading terminal with real-time streaming, portfolio management, and LLM chat integration
**Researched:** 2026-03-13
**Overall confidence:** HIGH (backend codebase fully inspected, architecture well-defined, frontend recommendations based on established 2024-2025 ecosystem)

## Executive Summary

FinAlly is a single-container trading workstation that streams live market data, manages a simulated $10k portfolio, and integrates an LLM chat assistant that can analyze positions and execute trades via natural language. The backend is substantially complete: market data streaming (8 modules, 73 tests, 84% coverage), SQLite database layer (schema, connection management, repository CRUD), portfolio management API (buy/sell, P&L calculation, snapshots), watchlist CRUD API, and LLM chat integration (LiteLLM to OpenRouter/Cerebras with structured output parsing and auto-trade execution). All backend code is built and locked in `uv.lock`.

The primary remaining work is the **Next.js frontend** -- a data-dense, dark-themed trading terminal UI that consumes the backend via REST endpoints and SSE streaming. This is approximately 60% of the remaining effort. The frontend needs: a watchlist panel with live prices and flash animations, sparkline mini-charts, a main price chart (Lightweight Charts), a portfolio heatmap/treemap (Recharts), a P&L line chart, a positions table, a trade bar, and an AI chat panel with inline action confirmations.

Secondary remaining work includes: **backend hardening** (fixing a race condition in concurrent trades, extracting duplicated trade logic into a shared service, wiring LLM watchlist changes to the MarketDataSource), **testing** (backend integration tests, frontend unit tests, Playwright E2E tests), and **Docker integration** (validating the multi-stage build with actual frontend code, start/stop scripts).

The technology stack is largely predetermined by the project specification and existing codebase. The key frontend decisions are: **Lightweight Charts** for financial price charts (canvas-based, purpose-built for trading terminals), **Recharts** for P&L charts and the portfolio treemap (React-idiomatic, includes Treemap component), **Tailwind CSS v3.4** for styling (stable ecosystem, straightforward dark theme config), and **React hooks + context** for state management (appropriate scale for a single-page single-user app).

## Key Findings

**Stack:** Backend locked (FastAPI 0.128.7, Python 3.12, aiosqlite, LiteLLM 1.81.10). Frontend: Next.js 15 + React 19 static export, Lightweight Charts + Recharts for charting, Tailwind CSS v3.4 for dark theme.

**Architecture:** Unidirectional data flow from PriceCache (the integration hub) to SSE stream to frontend. Backend owns all business logic; frontend is purely a display/input layer. Six SQLite tables, five REST endpoints, one SSE endpoint, all implemented.

**Critical pitfall:** SQLite race condition in concurrent trade execution -- the repository pattern opens/closes connections per function call, allowing TOCTOU bugs when manual trades and LLM-triggered trades overlap. Must wrap trade execution in a single-connection transaction with `BEGIN IMMEDIATE`.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Backend Hardening** - Fix critical bugs before building frontend against these APIs
   - Addresses: Race condition in trades (Pitfall 1), duplicated trade logic (Pitfall 2), LLM watchlist not syncing to MarketDataSource (Pitfall 12)
   - Avoids: Building frontend against buggy APIs that will need interface changes

2. **Frontend Shell + Streaming** - Prove SSE integration end-to-end with the most visual component
   - Addresses: Next.js project setup, Tailwind dark theme, EventSource hook, watchlist panel, price flash animations, connection status, header
   - Avoids: Static export gotchas (Pitfall 10), over-engineered state management

3. **Frontend Trading + Portfolio** - Core user interactions and portfolio visualization
   - Addresses: Trade bar, positions table, portfolio heatmap (treemap), P&L chart, main price chart, sparklines
   - Avoids: Sparkline memory leak (Pitfall 3), treemap edge cases (Pitfall 15), stale data after trade (Pitfall 17)

4. **Frontend Chat + AI** - The capstone "wow" feature, depends on working portfolio UI
   - Addresses: Chat panel, conversation history, inline trade/watchlist confirmations, loading state
   - Avoids: Flashing unchanged prices (Pitfall 13), context window overflow (Pitfall 9)

5. **Docker + E2E Tests** - Full stack integration, requires all features complete
   - Addresses: Multi-stage Dockerfile validation, Playwright E2E tests, start/stop scripts
   - Avoids: Build cache invalidation (Pitfall 11), static mount route conflicts (Pitfall 14)

**Phase ordering rationale:**
- Backend hardening first because the frontend will be built against these APIs -- fixing the race condition and extracting trade logic now prevents rework later.
- Frontend shell before trading/charts because SSE integration is the technical risk and foundation for all other components.
- Chat panel after portfolio because the chat UI needs to show inline trade confirmations, which requires the portfolio display to be working.
- Docker and E2E last because they test the complete stack and require both frontend and backend to be stable.

**Phases 2 and 3 could potentially be combined** if a single milestone covers the full frontend build, but separating them creates two testable checkpoints.

**Research flags for phases:**
- Phase 1: Standard patterns, unlikely to need additional research. The fixes are well-defined from code analysis.
- Phase 2: May need deeper research on Tailwind v3 vs v4 if `create-next-app` installs v4 by default. The `output: 'export'` configuration is straightforward but has documented gotchas.
- Phase 3: Lightweight Charts React integration patterns may need research -- it is an imperative library used in a declarative React context. Recharts Treemap custom content rendering may need examples.
- Phase 4: LLM response rendering (inline confirmations, action cards) is custom UI work that follows standard React patterns.
- Phase 5: Playwright configuration for testing against Docker containers is well-documented. The `docker-compose.test.yml` already exists.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (backend), MEDIUM (frontend) | Backend versions verified from lockfile. Frontend versions based on training data; use `create-next-app@latest` to get current stable. |
| Features | HIGH | Feature list derived directly from PLAN.md and existing backend API surface. Table stakes vs differentiators well-defined. |
| Architecture | HIGH | Based on direct code analysis of the existing codebase. Data flows and component boundaries are concrete, not speculative. |
| Pitfalls | HIGH | 17 pitfalls identified, 10 from direct code analysis (race conditions, duplicated logic, missing wiring), 7 from domain patterns. |

## Gaps to Address

- **Tailwind CSS version:** `create-next-app --tailwind` may install v4 by default in March 2026. If so, the configuration approach differs (CSS `@theme` instead of `tailwind.config.js`). Either version works; the research recommends v3.4 but acknowledges v4 is acceptable.
- **Lightweight Charts React patterns:** The library is imperative (create chart, add series, update data). React integration requires `useRef` + `useEffect` patterns for mounting/unmounting. Phase 3 may need specific pattern research.
- **Recharts Treemap custom content:** The treemap needs custom coloring by P&L value. Recharts supports `customContent` prop, but examples of financial-style coloring may be limited. Phase 3 research topic.
- **LLM context window limits:** The `gpt-oss-120b` model's context window size is unverified. The current 20-message history limit is a reasonable default, but actual token budget should be confirmed.
- **Node 20 vs Node 22 LTS:** The Dockerfile uses Node 20. Node 22 LTS may be current by March 2026. Either works; Node 20 is the safer choice for the Docker build stage.

## Sources

- Direct codebase analysis: `backend/app/` (13 Python modules), `Dockerfile`, `docker-compose.yml`, `pyproject.toml`, `uv.lock`
- Project documentation: `planning/PLAN.md`, `planning/MARKET_DATA_SUMMARY.md`, `.planning/PROJECT.md`
- Training data (May 2025 cutoff): frontend library versions, React patterns, Next.js static export behavior
