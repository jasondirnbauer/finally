# Roadmap: FinAlly — AI Trading Workstation

## Overview

The market data subsystem is already complete (Phase 0 — done). The remaining work delivers five coherent capabilities in dependency order: backend hardening ensures the APIs are correct before the frontend is built against them; the frontend shell proves SSE integration and establishes the terminal aesthetic; trading and portfolio visualization delivers the core user interactions and charts; the AI chat panel completes the capstone "wow" feature; and Docker plus testing validates the full stack end-to-end.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 0: Market Data** - GBM simulator, PriceCache, SSE stream, Massive API — COMPLETE
- [x] **Phase 1: Backend Hardening** - Fix race condition, extract TradeService, wire LLM watchlist, add snapshot task (completed 2026-03-14)
- [ ] **Phase 2: Frontend Shell + Streaming** - Next.js project, dark terminal layout, SSE hook, watchlist panel, header
- [ ] **Phase 3: Trading + Portfolio Visualization** - Trade bar, positions table, price chart, heatmap, P&L chart, sparklines
- [ ] **Phase 4: AI Chat** - Chat panel, LLM integration, inline trade/watchlist confirmations, loading state
- [ ] **Phase 5: Docker + Testing** - Multi-stage Dockerfile, start/stop scripts, backend unit tests, frontend unit tests, Playwright E2E

## Phase Details

### Phase 1: Backend Hardening
**Goal**: The backend APIs are correct, race-condition-free, and ready for a frontend to be built against them
**Depends on**: Phase 0 (complete)
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04
**Success Criteria** (what must be TRUE):
  1. Two simultaneous trade requests (manual + LLM) cannot double-spend cash or oversell shares — the transaction isolation prevents it
  2. Calling POST /api/portfolio/trade and triggering an LLM trade both execute through the same TradeService code path with no duplication
  3. When the LLM adds or removes a ticker from the watchlist, the live price stream immediately includes or stops including that ticker
  4. Portfolio value is recorded in portfolio_snapshots every 30 seconds and within 1 second of any trade execution
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Create TradeService with atomic transaction, snapshot, watchlist sync + full TDD test suite
- [ ] 01-02-PLAN.md — Wire TradeService into portfolio route, LLM service, and main.py; fix async LLM call

### Phase 2: Frontend Shell + Streaming
**Goal**: Users see a dark trading terminal in their browser with live-streaming prices the moment they open it
**Depends on**: Phase 1
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05
**Success Criteria** (what must be TRUE):
  1. Opening http://localhost:8000 shows the terminal UI within 3 seconds — dark background, all panels visible, no blank white flash
  2. The watchlist panel shows all 10 default tickers with current price, change amount, and change % — and those prices update without a page reload
  3. Each price update triggers a brief green (uptick) or red (downtick) background flash on that row that fades over ~500ms
  4. The connection status dot in the header shows green when SSE is connected, yellow while reconnecting, and red when disconnected for more than a few seconds
  5. The header displays the current total portfolio value and cash balance, both updating live as prices change
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Scaffold Next.js project: static export config, Tailwind dark theme, shared types, format helpers, API wrappers, Jest setup
- [ ] 02-02-PLAN.md — Build usePriceStream SSE hook, PriceContext with portfolio polling, terminal shell page layout
- [ ] 02-03-PLAN.md — Build Header (connection dot, portfolio display) and Watchlist (price flash animation, ticker rows) with unit tests

### Phase 3: Trading + Portfolio Visualization
**Goal**: Users can trade, monitor their positions in a visual heatmap, and see their portfolio P&L history — the full core trading experience
**Depends on**: Phase 2
**Requirements**: CHART-01, CHART-02, CHART-03, CHART-04, TRADE-01, TRADE-02, TRADE-03, DISP-03
**Success Criteria** (what must be TRUE):
  1. Clicking a ticker in the watchlist shows a price chart for that ticker in the main chart area, built from data accumulated since page load
  2. The trade bar lets a user type a ticker and quantity, click Buy or Sell, and see the trade execute instantly with their cash balance and positions updating immediately — no confirmation dialog
  3. Attempting to buy with insufficient cash or sell more shares than owned shows a clear error message without executing the trade
  4. The portfolio heatmap shows each position as a rectangle sized by portfolio weight and colored green (profit) or red (loss) in proportion to P&L
  5. The P&L chart shows a line of total portfolio value over time using data from portfolio_snapshots, and gains a new point after each trade
  6. The positions table lists every open position with ticker, quantity, average cost, current price, unrealized P&L, and % change — all updating live
**Plans**: TBD

### Phase 4: AI Chat
**Goal**: Users can have a natural language conversation with an AI assistant that understands their portfolio and can execute trades and watchlist changes on their behalf
**Depends on**: Phase 3
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06
**Success Criteria** (what must be TRUE):
  1. The chat panel is visible and dockable, with a message input field and scrollable conversation history showing all prior messages in the session
  2. While the AI is processing a response, a loading indicator is visible — the UI does not appear frozen or blank
  3. Typing "buy 5 shares of AAPL" and sending it causes the AI to execute that trade — the user's cash decreases and the AAPL position appears without any manual interaction beyond sending the message
  4. After a trade or watchlist change is auto-executed by the AI, a styled confirmation card appears inline in the chat showing what was done (e.g., "Bought 5 AAPL at $187.42")
  5. Asking "analyze my portfolio" returns a substantive AI response covering position composition, concentration risk, and unrealized P&L — using actual current data
  6. Asking the AI to "add PYPL to my watchlist" causes PYPL to appear in the watchlist panel with live-streaming prices
**Plans**: TBD

### Phase 5: Docker + Testing
**Goal**: The complete application runs from a single docker run command and has automated tests validating the critical paths
**Depends on**: Phase 4
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Running the start script on macOS/Linux or Windows starts the container and opens the app — a user with Docker installed can go from git clone to working app in under 5 minutes
  2. Backend pytest suite passes with tests covering trade execution (including edge cases), P&L calculation, LLM structured output parsing, and all API route response shapes
  3. Frontend unit tests pass covering the watchlist component, price flash animation trigger, trade bar validation, and portfolio display calculations
  4. Playwright E2E tests pass end-to-end: fresh start shows default watchlist and $10k balance, user can add/remove tickers, buy/sell shares, and the mocked AI chat returns a response
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Market Data | - | Complete | 2026-03-13 |
| 1. Backend Hardening | 2/2 | Complete   | 2026-03-14 |
| 2. Frontend Shell + Streaming | 0/3 | Not started | - |
| 3. Trading + Portfolio Visualization | 0/TBD | Not started | - |
| 4. AI Chat | 0/TBD | Not started | - |
| 5. Docker + Testing | 0/TBD | Not started | - |
