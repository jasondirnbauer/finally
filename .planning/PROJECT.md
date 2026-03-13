# FinAlly — AI Trading Workstation

## What This Is

FinAlly (Finance Ally) is a visually stunning AI-powered trading workstation that streams live market data, lets users trade a simulated portfolio with $10k virtual cash, and integrates an LLM chat assistant that can analyze positions and execute trades via natural language. It looks and feels like a modern Bloomberg terminal with an AI copilot — all served from a single Docker container on port 8000. This is the capstone project for an agentic AI coding course, built entirely by orchestrated coding agents.

## Core Value

Users can watch live streaming prices, trade a simulated portfolio, and chat with an AI assistant that understands their positions and can execute trades on their behalf — all from a single browser tab with zero setup beyond `docker run`.

## Requirements

### Validated

- ✓ Market data streaming via SSE (simulator + Massive/Polygon.io) — Phase 0
- ✓ GBM price simulation with correlated sector moves and shock events — Phase 0
- ✓ Thread-safe PriceCache as single source of truth — Phase 0
- ✓ Strategy pattern for swappable data sources — Phase 0

### Active

- [ ] SQLite database with lazy initialization and schema seeding
- [ ] Portfolio management — buy/sell market orders, position tracking, P&L calculation
- [ ] Portfolio value snapshots for historical P&L charting
- [ ] Watchlist CRUD API with dynamic ticker management
- [ ] LLM chat integration via LiteLLM → OpenRouter (Cerebras inference)
- [ ] Structured output parsing for auto-executing trades and watchlist changes from chat
- [ ] Chat history persistence in SQLite
- [ ] LLM mock mode for testing (`LLM_MOCK=true`)
- [ ] Dark terminal-aesthetic frontend (Next.js static export)
- [ ] Watchlist panel with live prices, flash animations, and sparkline mini-charts
- [ ] Main chart area for selected ticker
- [ ] Portfolio heatmap (treemap) sized by weight, colored by P&L
- [ ] P&L line chart from portfolio snapshots
- [ ] Positions table with unrealized P&L
- [ ] Trade bar — ticker, quantity, buy/sell buttons
- [ ] AI chat panel with conversation history and inline trade confirmations
- [ ] Header with live portfolio value, cash balance, connection status
- [ ] Multi-stage Dockerfile (Node build → Python runtime)
- [ ] Start/stop scripts for macOS/Linux and Windows
- [ ] Backend unit tests (pytest) for portfolio, chat, API routes
- [ ] Frontend unit tests for components
- [ ] Playwright E2E tests with docker-compose.test.yml

### Out of Scope

- User authentication/login — single-user, no signup
- Limit orders / order book — market orders only for simplicity
- Real-time chat streaming (token-by-token) — Cerebras is fast enough; use loading indicator
- Mobile app — web-first, desktop-optimized
- Cloud deployment (Terraform/App Runner) — stretch goal, not core
- Multi-user support — schema has user_id for future use, but not implemented

## Context

- **Stack**: FastAPI (Python/uv) backend, Next.js (TypeScript) static export frontend, SQLite database, SSE for real-time data, LiteLLM for LLM access
- **Market data subsystem is complete**: 8 modules in `backend/app/market/`, 73 passing tests, 84% coverage. Simulator uses GBM with Cholesky-correlated sector moves. See `planning/MARKET_DATA_SUMMARY.md`.
- **Course context**: This demonstrates agentic AI building a production-quality app. The "wow factor" matters — it should look impressive and feel fluid.
- **Design aesthetic**: Bloomberg/trading terminal — dark theme (#0d1117), data-dense, accent yellow (#ecad0a), blue primary (#209dd7), purple secondary (#753991) for submit buttons.
- **Auto-execution by design**: LLM trades execute automatically (no confirmation) because it's simulated money and demonstrates agentic capabilities.

## Constraints

- **Single container**: Everything runs in one Docker container on port 8000 — no docker-compose for production
- **No CORS**: Frontend is a static export served by FastAPI from the same origin
- **Environment-driven**: Simulator by default; real data only if `MASSIVE_API_KEY` is set
- **LLM provider**: LiteLLM → OpenRouter with Cerebras inference, using `openrouter/openai/gpt-oss-120b` model
- **No auth**: Single user ("default"), no login flow

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SSE over WebSockets | One-way push is sufficient; simpler, universal browser support | ✓ Good |
| Static Next.js export | Same-origin serving, no CORS, single container | — Pending |
| SQLite over Postgres | Single-user, no DB server needed, zero config | — Pending |
| Market orders only | Eliminates order book complexity, dramatically simpler portfolio math | — Pending |
| Auto-execute LLM trades | Zero-stakes sim money + impressive agentic demo | — Pending |
| uv for Python | Modern, fast, reproducible lockfile | ✓ Good |

---
*Last updated: 2026-03-13 after initialization*
