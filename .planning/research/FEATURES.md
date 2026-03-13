# Feature Landscape

**Domain:** AI-powered simulated trading workstation (Bloomberg-terminal aesthetic)
**Researched:** 2026-03-13
**Overall confidence:** MEDIUM (based on training data knowledge of Bloomberg Terminal, TradingView, Thinkorswim, Robinhood, eToro, Alpaca, and emerging AI trading tools; no live web verification available)

## Table Stakes

Features users expect from a trading workstation. Missing any of these and the product feels broken or incomplete. These are derived from what every Bloomberg/TradingView competitor ships and what the PLAN.md already specifies.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Live price streaming** | Core of any trading terminal. Users need to see prices move in real-time. Dead prices = dead product. | Medium | DONE. SSE streaming at ~500ms from PriceCache. |
| **Price flash animations** | Green/red flashes on price change are the universal visual language of trading UIs. Without them, the terminal feels static. | Low | CSS transitions on price update events. 500ms fade is industry standard. |
| **Watchlist with CRUD** | Every trading platform has a customizable watchlist. Users expect to add/remove tickers freely. | Low | Backend API exists (watchlist routes). Frontend needs the panel. |
| **Current price + change display** | Ticker, last price, change amount, change % — the minimum data density per row in any watchlist. | Low | Data available from SSE stream. Frontend formatting concern. |
| **Sparkline mini-charts** | Inline price history beside each ticker. TradingView, Bloomberg, and even Robinhood show these. They communicate trend at a glance without clicking. | Medium | Must accumulate price history from SSE on the frontend since page load. Progressive fill-in is actually a nice visual effect. |
| **Main price chart (selected ticker)** | Clicking a ticker must show a larger chart. This is the single most-used component in any trading UI. | Medium | Needs a canvas-based charting library. Lightweight Charts (by TradingView) is the standard for this exact use case. |
| **Portfolio positions table** | Tabular view: ticker, qty, avg cost, current price, unrealized P&L, % change. Every broker dashboard has this. | Low | Backend GET /api/portfolio returns all needed data. Frontend table component. |
| **Buy/sell trade execution** | The ability to place market orders. Without this, it is just a data viewer, not a trading platform. | Low | DONE on backend (POST /api/portfolio/trade). Frontend needs trade bar UI. |
| **Cash balance display** | Users need to know how much buying power they have. Always visible, ideally in the header. | Low | Available from portfolio API. |
| **Total portfolio value** | Aggregate value (cash + positions) visible at all times. This is the "score" in a trading game. | Low | Computed by portfolio API. Header component. |
| **P&L tracking (unrealized)** | Per-position and total unrealized P&L. Color-coded green/red. This is what makes trading feel real. | Low | Backend computes this already. Frontend display concern. |
| **AI chat panel** | For this product specifically, the LLM chat is a core value proposition, not a nice-to-have. Users come for the AI copilot. | High | Backend LLM service exists. Frontend needs chat UI with message history, loading state, and inline action confirmations. |
| **Trade execution via chat** | The AI can buy/sell on command. This is the "agentic" differentiator that the course showcases. Must work or the demo falls flat. | High | Backend auto-execution is implemented. Frontend must render trade confirmations inline in chat. |
| **Connection status indicator** | SSE connections drop. Users need to know if data is stale. Green/yellow/red dot in header. | Low | EventSource has built-in reconnect. Frontend needs to track readyState. |
| **Dark theme** | Trading terminals are universally dark. A light theme would immediately look "wrong" to the target audience. | Low | Tailwind dark theme configuration. Spec has exact color values. |
| **Portfolio value history chart (P&L line)** | Users want to see if they are winning or losing over time. Line chart from portfolio_snapshots. | Medium | Backend records snapshots every 30s + on trades. Frontend chart component. |

## Differentiators

Features that set FinAlly apart from generic paper trading platforms. Not strictly expected, but they create the "wow factor" the course demands.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Portfolio heatmap (treemap)** | Visually striking. Positions sized by weight, colored by P&L. Bloomberg has their version; TradingView has a market heatmap. Seeing your portfolio as colored rectangles is immediately understandable and impressive in demos. | Medium | Treemap visualization. Libraries like D3 or dedicated treemap components. The key is getting the color gradient right (green-to-red based on P&L %). |
| **LLM auto-execution (no confirmation)** | Most AI trading tools require confirmation before executing. FinAlly deliberately skips this because it is simulated money. This creates a fluid, "the AI just did it" experience that is genuinely impressive in demos. | Low | Already implemented in backend. Frontend just needs to render the confirmation inline. The design decision is the differentiator, not the code. |
| **AI portfolio analysis** | Ask "how concentrated am I?" or "what's my risk?" and get intelligent analysis. Most paper trading apps have zero analytical capability. | Low | Backend LLM service already has portfolio context. The system prompt drives quality here, not additional code. |
| **AI watchlist management** | "Add PYPL and remove JPM" via natural language. Small feature, but demonstrates the AI's scope of control beyond just trades. | Low | Backend handles this. Frontend shows inline confirmation. |
| **Inline action confirmations in chat** | When the AI executes a trade, the chat shows a structured confirmation card (ticker, side, quantity, price, status) rather than just text. This visual treatment elevates the chat from "text responses" to "an agent showing its work." | Medium | Frontend component design. Parse the trades/watchlist_changes from the chat response and render them as styled cards within the message flow. |
| **Zero-setup Docker experience** | `docker run` and you have a full trading terminal. No signup, no API keys required (simulator mode), no database setup. This is rare — most trading platforms require registration. | Medium | Architecture supports this. Multi-stage Dockerfile, lazy DB init, env-driven data source. |
| **Progressive sparkline fill** | Sparklines start empty and fill in as SSE data arrives. This creates a "the system just came alive" visual moment that is unique and memorable. Most platforms show pre-loaded historical data. | Low | Natural consequence of accumulating SSE data on the frontend. No extra backend work needed. |

## Anti-Features

Features to explicitly NOT build. These would add complexity without proportional value, distract from the core demo, or violate the project's design philosophy.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User authentication / login** | Single-user app. Auth adds massive complexity (sessions, tokens, password management) for zero user value in a demo/course context. | Hardcoded "default" user_id. Schema has user_id column for future extensibility, but no login flow. |
| **Limit orders / order types** | Order books, partial fills, time-in-force, stop-loss — each is individually complex and collectively they multiply the testing surface by 10x. Market orders are sufficient for a trading demo. | Market orders only, instant fill at current price. The LLM can explain what limit orders are if asked. |
| **Real money / brokerage integration** | Regulatory nightmare (KYC, AML, SEC). Completely out of scope. Would transform the project from a demo into a fintech company. | Virtual $10k balance. Make it clear in the UI this is simulated. |
| **Token-by-token chat streaming** | SSE streaming for chat responses adds complexity (buffering, partial JSON parsing, error recovery mid-stream). Cerebras inference is fast enough that a loading spinner is acceptable. | Complete JSON response with loading indicator. The response will typically arrive in 1-3 seconds. |
| **Historical candlestick data** | Loading real OHLCV history requires an additional data source, caching layer, and time-range selectors. The simulator generates forward-looking data only. | Accumulate price ticks from SSE since page load. The chart fills in progressively, which is actually a unique visual feature. For the main chart, show accumulated ticks as a line chart. |
| **News feed / sentiment analysis** | Requires a news API, NLP pipeline, and a whole additional panel. Feature creep that would delay core features. | The LLM can discuss market sentiment from its training data when asked. No real-time news feed needed. |
| **Options / derivatives** | Greeks, option chains, expiry management — each is a product unto itself. Massive complexity for a feature most course viewers would not understand. | Stocks only. Keep it simple. |
| **Multiple accounts / paper vs. live toggle** | Multi-account adds DB complexity, account switching UI, and testing permutations. One account is fine for a demo. | Single default account with $10k starting balance. |
| **Mobile-first design** | The Bloomberg aesthetic is desktop-first. Trading terminals use wide screens to display dense data. Responsive is nice; mobile-first is wrong for this product. | Desktop-first layout. Should be functional (not broken) on tablet. Do not invest in mobile breakpoints. |
| **Custom technical indicators (MACD, RSI, Bollinger)** | Each indicator requires correct mathematical implementation, configuration UI, and chart overlay logic. Feature creep. | The price chart shows price over time. If a user asks the LLM "is AAPL overbought?", the LLM can reason about it from the price data in context. |
| **Portfolio reset / multiple portfolios** | Reset-to-$10k and save/load multiple portfolios add state management complexity. | Single portfolio, persistent across sessions. If a user wants to reset, they can delete the Docker volume (`docker volume rm finally-data`). |
| **Social features / leaderboards** | Multi-user prerequisite. Out of scope. | Single-user app. |
| **Alerts / notifications** | Price alerts require a notification system, threshold management UI, and background monitoring. Nice-to-have that can be replaced by asking the AI. | Ask the LLM "tell me if AAPL drops below $180" — it cannot actually monitor, but can check the current price and advise. |

## Feature Dependencies

```
Market Data Streaming (DONE)
  |
  +---> Watchlist Panel (needs SSE prices)
  |       |
  |       +---> Sparkline Mini-Charts (needs accumulated price history from SSE)
  |       |
  |       +---> Price Flash Animations (needs price change events)
  |       |
  |       +---> Main Chart Area (needs ticker selection from watchlist + SSE data)
  |
  +---> Portfolio API (needs PriceCache for current prices)
  |       |
  |       +---> Positions Table (needs portfolio API response)
  |       |
  |       +---> Portfolio Heatmap (needs positions with weights + P&L)
  |       |
  |       +---> P&L History Chart (needs portfolio_snapshots from DB)
  |       |
  |       +---> Header Values (needs total value, cash, P&L)
  |
  +---> Trade Execution (needs PriceCache for fill price)
          |
          +---> Trade Bar UI (needs trade API + price validation)
          |
          +---> AI Chat Panel (needs LLM service + trade execution)
                  |
                  +---> Inline Action Confirmations (needs chat response parsing)
                  |
                  +---> AI Watchlist Management (needs watchlist API)
```

Key dependency insight: **Everything flows from the market data layer**, which is already complete. The next critical path is:

1. **Database + Portfolio API** (backend foundation for everything else)
2. **Frontend shell with watchlist** (first visual component, proves SSE integration works end-to-end)
3. **Trade execution UI** (makes the portfolio interactive)
4. **Chat panel** (the capstone feature that ties everything together)

## MVP Recommendation

### Must Ship (Phase 1 -- Backend Foundation)

The backend services that every frontend component depends on:

1. **SQLite database with lazy init** -- all frontend features need persistent state
2. **Portfolio API** (GET portfolio, POST trade, GET history) -- already coded, needs integration testing
3. **Watchlist API** (GET, POST, DELETE) -- already coded, needs integration testing
4. **Portfolio snapshot background task** -- records total value every 30s for the P&L chart
5. **Health check endpoint** -- needed for Docker health checks

### Must Ship (Phase 2 -- Frontend Core)

The minimum UI that creates the "trading terminal" experience:

1. **Watchlist panel with live prices and flash animations** -- the first thing users see; proves real-time works
2. **Header with portfolio value, cash, connection status** -- persistent context for the user
3. **Positions table** -- shows what you own
4. **Trade bar** -- lets you trade (the core interaction)
5. **Main price chart** -- shows price over time for selected ticker
6. **Sparkline mini-charts** -- the visual signature of a trading terminal

### Must Ship (Phase 3 -- AI + Visualization)

The features that create the "wow factor":

1. **AI chat panel with message history** -- the core differentiator
2. **Inline trade/watchlist confirmations** -- makes AI actions visible
3. **Portfolio heatmap (treemap)** -- the most visually impressive component
4. **P&L history chart** -- shows portfolio performance over time

### Defer

- **E2E Playwright tests** -- important but should come after features stabilize. Phase 4.
- **Docker multi-stage build** -- needed for deployment but can develop with `uv run` + `npm run dev` locally. Phase 4.
- **Start/stop scripts** -- last mile polish. Phase 4.

## Complexity Budget

| Category | Count | Avg Complexity | Total Effort |
|----------|-------|---------------|--------------|
| Table stakes | 16 | Low-Medium | ~60% of build |
| Differentiators | 7 | Low-Medium | ~25% of build |
| Infrastructure (Docker, tests, scripts) | 4 | Medium | ~15% of build |

The market data subsystem (the hardest technical component) is already done. The remaining work is primarily:
- **Backend**: Database layer, API routes (partially done), background tasks, LLM integration (done)
- **Frontend**: This is where 60%+ of remaining effort lives -- building the dense, dark, data-rich UI with real-time updates, charts, and the chat panel

## Competitive Landscape Context

### What Bloomberg Terminal Has (That We Deliberately Skip)

Bloomberg's value comes from exclusive data, a massive function library (>30,000 commands), multi-asset coverage, and a $24,000/year price tag. FinAlly borrows the *aesthetic* (dark, data-dense, professional) but not the *scope*. This is intentional -- the project demonstrates AI-assisted trading, not data aggregation.

### What TradingView Has (That We Selectively Adopt)

TradingView's strength is charting (100+ indicators, drawing tools, multi-timeframe). We adopt: sparklines, price charts, the watchlist paradigm. We skip: technical indicators, drawing tools, multi-timeframe analysis. Our charts are "good enough" to communicate price action; they are not a charting product.

### What Robinhood Has (That We Reinterpret)

Robinhood's simplicity (one-tap trading, clean portfolio view) is a good influence. Our trade bar should be equally simple: ticker, quantity, buy/sell. No confirmation dialog, no order type selector, no advanced settings. The heatmap and positions table serve the role of Robinhood's portfolio screen.

### What No One Else Has (Our Actual Differentiator)

**An AI that can analyze your portfolio and execute trades without confirmation, in a zero-stakes simulated environment.** This is genuinely novel for a self-hosted, zero-setup trading workstation. Alpaca and similar platforms have API-based algorithmic trading, but not conversational AI with structured output auto-execution. This is the demo moment.

## Sources

- Project PLAN.md and existing codebase (HIGH confidence -- primary source of truth)
- Training data knowledge of Bloomberg Terminal, TradingView, Thinkorswim, Robinhood, eToro, Alpaca platforms (MEDIUM confidence -- based on training data, not live verification)
- Trading terminal UI/UX conventions are well-established and unlikely to have changed significantly (HIGH confidence for table stakes features)
