# Requirements: FinAlly

**Defined:** 2026-03-13
**Core Value:** Users can watch live streaming prices, trade a simulated portfolio, and chat with an AI assistant that understands their positions and can execute trades — all from a single browser tab with zero setup.

## v1 Requirements

### Backend Hardening

- [ ] **BACK-01**: Trade execution wrapped in single-connection BEGIN IMMEDIATE transaction to prevent race conditions
- [ ] **BACK-02**: Trade logic extracted into shared TradeService used by both portfolio route and LLM service
- [ ] **BACK-03**: LLM watchlist changes synced to MarketDataSource (add_ticker/remove_ticker)
- [ ] **BACK-04**: Portfolio snapshot background task records total value every 30 seconds and immediately after each trade

### Real-Time Display

- [ ] **DISP-01**: Watchlist panel shows all watched tickers with current price, change amount, and change %
- [ ] **DISP-02**: Price flash animations — green highlight on uptick, red on downtick, fading over ~500ms via CSS transitions
- [ ] **DISP-03**: Sparkline mini-charts beside each ticker, accumulated from SSE data since page load
- [ ] **DISP-04**: Connection status indicator in header — green (connected), yellow (reconnecting), red (disconnected)
- [ ] **DISP-05**: Header displays portfolio total value, cash balance, updating live from SSE + portfolio API

### Charts & Visualization

- [ ] **CHART-01**: Main price chart for selected ticker using canvas-based charting library (Lightweight Charts)
- [ ] **CHART-02**: Portfolio heatmap/treemap — positions sized by portfolio weight, colored by P&L (green=profit, red=loss)
- [ ] **CHART-03**: P&L history line chart showing total portfolio value over time from portfolio_snapshots
- [ ] **CHART-04**: Positions table — ticker, quantity, avg cost, current price, unrealized P&L, % change

### Trading

- [ ] **TRADE-01**: Trade bar with ticker field, quantity field, buy button, sell button
- [ ] **TRADE-02**: Market orders execute instantly at current price with no confirmation dialog
- [ ] **TRADE-03**: Validation — insufficient cash for buys or insufficient shares for sells returns clear error

### AI Chat

- [ ] **CHAT-01**: Chat panel (docked/collapsible sidebar) with message input and scrolling conversation history
- [ ] **CHAT-02**: Loading indicator while waiting for LLM response
- [ ] **CHAT-03**: User can ask the AI to execute trades via natural language, trades auto-execute
- [ ] **CHAT-04**: Inline action confirmations — trade executions and watchlist changes shown as styled cards in chat
- [ ] **CHAT-05**: AI can analyze portfolio composition, risk concentration, and P&L when asked
- [ ] **CHAT-06**: AI can add/remove tickers from watchlist via natural language

### Infrastructure

- [ ] **INFRA-01**: Multi-stage Dockerfile — Node 20 builds frontend static export, Python 3.12 serves via FastAPI
- [ ] **INFRA-02**: Start/stop scripts for macOS/Linux (bash) and Windows (PowerShell)
- [ ] **INFRA-03**: Playwright E2E tests in test/ directory with docker-compose.test.yml
- [ ] **INFRA-04**: Backend unit tests (pytest) for portfolio, chat, and API routes
- [ ] **INFRA-05**: Frontend unit tests for key components

## v2 Requirements

### Notifications

- **NOTF-01**: Price alert system (user sets threshold, gets notified)
- **NOTF-02**: Trade confirmation notifications (toast/popup)

### Enhanced Charting

- **ECHART-01**: Technical indicators (MACD, RSI, Bollinger Bands)
- **ECHART-02**: Multi-timeframe chart views
- **ECHART-03**: Drawing tools on charts

### Multi-User

- **MULTI-01**: User authentication (signup/login)
- **MULTI-02**: Multiple portfolios per user
- **MULTI-03**: Portfolio reset to $10k

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication/login | Single-user demo app; auth adds massive complexity for zero value |
| Limit orders / order types | Market orders only; order book complexity not justified for demo |
| Real money / brokerage integration | Regulatory nightmare; simulated money only |
| Token-by-token chat streaming | Cerebras inference is fast enough; loading indicator suffices |
| Historical candlestick data | Accumulate from SSE instead; progressive fill is actually a nice visual |
| News feed / sentiment analysis | Feature creep; LLM can discuss sentiment from training data |
| Options / derivatives | Each is a product unto itself; stocks only |
| Mobile-first design | Desktop-first Bloomberg aesthetic; functional on tablet but not optimized |
| Custom technical indicators | Feature creep; LLM can reason about price data verbally |
| Social features / leaderboards | Requires multi-user; out of scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACK-01 | Phase 1 | Pending |
| BACK-02 | Phase 1 | Pending |
| BACK-03 | Phase 1 | Pending |
| BACK-04 | Phase 1 | Pending |
| DISP-01 | Phase 2 | Pending |
| DISP-02 | Phase 2 | Pending |
| DISP-03 | Phase 3 | Pending |
| DISP-04 | Phase 2 | Pending |
| DISP-05 | Phase 2 | Pending |
| CHART-01 | Phase 3 | Pending |
| CHART-02 | Phase 3 | Pending |
| CHART-03 | Phase 3 | Pending |
| CHART-04 | Phase 3 | Pending |
| TRADE-01 | Phase 3 | Pending |
| TRADE-02 | Phase 3 | Pending |
| TRADE-03 | Phase 3 | Pending |
| CHAT-01 | Phase 4 | Pending |
| CHAT-02 | Phase 4 | Pending |
| CHAT-03 | Phase 4 | Pending |
| CHAT-04 | Phase 4 | Pending |
| CHAT-05 | Phase 4 | Pending |
| CHAT-06 | Phase 4 | Pending |
| INFRA-01 | Phase 5 | Pending |
| INFRA-02 | Phase 5 | Pending |
| INFRA-03 | Phase 5 | Pending |
| INFRA-04 | Phase 5 | Pending |
| INFRA-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 27 total (note: initial count of 23 was incorrect — actual count is 27)
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation — traceability populated*
