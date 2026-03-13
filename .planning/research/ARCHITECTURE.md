# Architecture Patterns

**Domain:** AI-powered simulated trading workstation (Bloomberg terminal aesthetic with LLM copilot)
**Researched:** 2026-03-13
**Overall Confidence:** HIGH (codebase is partially built; architecture is evidence-based, not speculative)

## System Overview

FinAlly is a single-container, single-port application with four major subsystems that compose into a unidirectional data flow. The market data subsystem is complete. The remaining work spans three subsystems (database/portfolio, LLM chat, frontend) plus integration infrastructure (Docker, E2E tests).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Docker Container (port 8000)                                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  FastAPI Application (app/main.py)                              │  │
│  │                                                                  │  │
│  │  Lifespan Manager                                                │  │
│  │  ├── init_db() ─────────────────────────> SQLite (lazy init)     │  │
│  │  ├── create_market_data_source(cache) ──> MarketDataSource       │  │
│  │  ├── source.start(watchlist_tickers) ──> Background task         │  │
│  │  └── _snapshot_loop(cache) ────────────> Periodic snapshots      │  │
│  │                                                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌───────────────────┐  │  │
│  │  │ /api/    │  │ /api/    │  │ /api/  │  │ /api/stream/      │  │  │
│  │  │ portfolio│  │ watchlist│  │ chat   │  │ prices (SSE)      │  │  │
│  │  └────┬─────┘  └────┬─────┘  └───┬────┘  └────────┬──────────┘  │  │
│  │       │              │            │                │             │  │
│  │       v              v            v                v             │  │
│  │  ┌─────────┐   ┌──────────┐  ┌────────┐   ┌─────────────────┐  │  │
│  │  │ DB Layer│   │ DB Layer │  │ LLM    │   │ PriceCache      │  │  │
│  │  │ (repo)  │   │ + Market │  │ Service│   │ (in-memory)     │  │  │
│  │  └────┬────┘   │ Source   │  └───┬────┘   └────────┬────────┘  │  │
│  │       │        └──────────┘      │                 │            │  │
│  │       v                          v                 ^            │  │
│  │  ┌─────────────────────────────────────┐   ┌──────┴─────────┐  │  │
│  │  │ SQLite (db/finally.db)             │   │ MarketData     │  │  │
│  │  │ - users_profile                     │   │ Source (sim/   │  │  │
│  │  │ - positions, trades                 │   │ Massive)       │  │  │
│  │  │ - watchlist                         │   └────────────────┘  │  │
│  │  │ - portfolio_snapshots               │                       │  │
│  │  │ - chat_messages                     │                       │  │
│  │  └─────────────────────────────────────┘                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Static Files (/* -> backend/static/)                           │  │
│  │  Next.js static export served by FastAPI                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### Existing (Complete)

| Component | Location | Responsibility | Communicates With |
|-----------|----------|---------------|-------------------|
| **PriceCache** | `app/market/cache.py` | Thread-safe in-memory price store with version counter | Read by: SSE stream, portfolio routes, trade execution, LLM context builder. Written by: MarketDataSource |
| **MarketDataSource** | `app/market/interface.py` | Abstract interface for price producers (simulator or Massive poller) | Writes to PriceCache. Managed by lifespan. Ticker list modified by watchlist routes |
| **SimulatorDataSource** | `app/market/simulator.py` | GBM price simulation with correlated moves and shock events | Writes to PriceCache at ~500ms intervals |
| **MassiveDataSource** | `app/market/massive_client.py` | REST polling of Polygon.io API | Writes to PriceCache at 15s intervals |
| **SSE Stream** | `app/market/stream.py` | Pushes price updates to connected browsers via SSE | Reads from PriceCache (version-based change detection) |

### Existing (Built, Needs Validation)

| Component | Location | Responsibility | Communicates With |
|-----------|----------|---------------|-------------------|
| **DB Layer** | `app/db/` | SQLite CRUD operations, lazy initialization, schema management | Called by: portfolio routes, watchlist routes, chat routes, LLM service, snapshot loop |
| **Portfolio Routes** | `app/routes/portfolio.py` | GET portfolio state, POST trade execution, GET history | Reads PriceCache for current prices. Reads/writes DB for positions, cash, trades, snapshots |
| **Watchlist Routes** | `app/routes/watchlist.py` | GET/POST/DELETE watchlist tickers | Reads/writes DB. Adds/removes tickers on MarketDataSource and PriceCache |
| **Chat Routes** | `app/routes/chat.py` | POST chat message, GET history | Calls LLM service. Reads/writes chat_messages in DB |
| **LLM Service** | `app/llm/service.py` | Builds context, calls LiteLLM, parses structured output, auto-executes actions | Reads PriceCache for context. Reads/writes DB for portfolio and watchlist changes. Calls LiteLLM -> OpenRouter |
| **LLM Mock** | `app/llm/mock.py` | Deterministic keyword-matching responses for testing | Returns LlmResponse based on regex matching |
| **Snapshot Loop** | `app/main.py` | Records portfolio value every 30 seconds | Reads PriceCache and positions DB, writes to portfolio_snapshots |

### To Be Built

| Component | Location | Responsibility | Communicates With |
|-----------|----------|---------------|-------------------|
| **Frontend App** | `frontend/` | Single-page Next.js static export with trading terminal UI | Connects to SSE stream. Calls all REST API endpoints. Renders all visualizations |
| **Docker Build** | `Dockerfile` | Multi-stage build: Node (frontend) -> Python (backend + static) | Exists but untested with actual frontend code |
| **E2E Tests** | `test/e2e/` | Playwright tests against full stack in Docker | Spec files exist but need the full stack running |
| **Start/Stop Scripts** | `scripts/` | Docker lifecycle management | Wrap docker commands |

## Data Flow

### Flow 1: Live Price Updates (existing, working)

```
MarketDataSource (background task, ~500ms)
  │
  ├──> PriceCache.update(ticker, price)  [write]
  │         │
  │         └──> version counter increments
  │
  v
SSE Stream (_generate_events loop, ~500ms poll)
  │
  ├──> PriceCache.version changed?
  │    YES: PriceCache.get_all() -> JSON -> SSE event
  │    NO:  sleep, check again
  │
  v
Browser (EventSource)
  │
  └──> Frontend state update -> re-render prices, flash animations, sparklines
```

### Flow 2: Manual Trade Execution

```
Frontend: POST /api/portfolio/trade {ticker, side, quantity}
  │
  v
Portfolio Route (execute_trade)
  │
  ├──> PriceCache.get_price(ticker) -> current_price  [read]
  ├──> DB: get_cash_balance()                          [read]
  ├──> Validation (sufficient cash/shares)
  ├──> DB: update_cash_balance()                       [write]
  ├──> DB: upsert_position() or delete_position()      [write]
  ├──> DB: insert_trade()                              [write]
  ├──> DB: insert_snapshot()                           [write]
  │
  v
Response: {trade, cash, total_value}
  │
  v
Frontend: Update portfolio display, positions table, heatmap
```

### Flow 3: AI Chat with Auto-Execution

```
Frontend: POST /api/chat {message}
  │
  v
Chat Route
  ├──> DB: insert_chat_message(role="user")            [write]
  │
  v
LLM Service (chat_with_llm)
  ├──> Build context:
  │    ├── DB: get_cash_balance(), get_positions(), get_watchlist()
  │    └── PriceCache: enrich positions with current prices
  ├──> DB: get_chat_history(limit=20)
  ├──> Build messages array (system + context + history + user msg)
  │
  ├──> IF LLM_MOCK=true:
  │    └── mock_chat() -> LlmResponse (regex-based)
  ├──> ELSE:
  │    └── LiteLLM completion() -> OpenRouter -> Cerebras
  │        └── Parse structured JSON -> LlmResponse
  │
  v
Execute Actions (_execute_actions)
  ├──> For each trade in LlmResponse.trades:
  │    ├── PriceCache.get_price()                      [read]
  │    ├── DB: validate cash/shares                    [read]
  │    ├── DB: update position, cash, trade record     [write]
  │    └── DB: insert_snapshot() (if trades executed)   [write]
  │
  ├──> For each watchlist_change:
  │    └── DB: add_to_watchlist() or remove_from_watchlist()  [write]
  │    (NOTE: does NOT update MarketDataSource — see Pitfall below)
  │
  v
Chat Route (continued)
  ├──> DB: insert_chat_message(role="assistant", actions=JSON)  [write]
  │
  v
Response: {message, trades: [...], watchlist_changes: [...]}
  │
  v
Frontend: Render message, show inline trade confirmations, refresh portfolio
```

### Flow 4: Watchlist Management

```
Frontend: POST /api/watchlist {ticker}  or  DELETE /api/watchlist/{ticker}
  │
  v
Watchlist Route
  ├──> DB: add_to_watchlist() / remove_from_watchlist()  [write]
  ├──> MarketDataSource: add_ticker() / remove_ticker()  [write]
  ├──> (on remove) PriceCache.remove(ticker)             [write]
  │
  v
Response: confirmation
  │
  v
MarketDataSource now includes/excludes ticker in update cycle
PriceCache will start/stop receiving updates for that ticker
SSE stream will include/exclude the ticker in subsequent events
```

### Flow 5: Portfolio Snapshots (Background)

```
_snapshot_loop (every 30 seconds, asyncio task)
  │
  ├──> DB: get_cash_balance()                           [read]
  ├──> DB: get_positions()                              [read]
  ├──> PriceCache: get_price() for each position        [read]
  ├──> Calculate total_value = cash + sum(price * qty)
  └──> DB: insert_snapshot(total_value)                 [write]

Also triggered immediately after each trade execution.
```

### Flow 6: Frontend Page Load

```
Browser: GET / (initial page load)
  │
  v
FastAPI: StaticFiles serves Next.js export from backend/static/
  │
  v
Browser: JavaScript loads, React hydrates
  │
  ├──> EventSource connects to /api/stream/prices       [SSE]
  ├──> GET /api/watchlist                               [REST]
  ├──> GET /api/portfolio                               [REST]
  ├──> GET /api/portfolio/history                       [REST]
  ├──> GET /api/chat/history                            [REST]
  │
  v
Frontend state populated -> Full UI rendered
  │
  └──> SSE events begin updating prices in real-time
```

## Recommended Architecture for Frontend

### Component Hierarchy

```
App (layout.tsx / page.tsx)
├── Header
│   ├── PortfolioValue (live-updating from portfolio state)
│   ├── CashBalance
│   └── ConnectionStatus (SSE connection state)
│
├── Main Content Area (grid layout)
│   ├── Watchlist Panel (left sidebar or top section)
│   │   └── WatchlistItem[] (ticker, price, change, sparkline)
│   │       └── Sparkline (canvas-based mini chart)
│   │
│   ├── Center Area
│   │   ├── PriceChart (selected ticker, large chart)
│   │   └── TradeBar (ticker input, qty input, buy/sell buttons)
│   │
│   └── Portfolio Area (right or bottom section)
│       ├── PortfolioHeatmap (treemap: sized by weight, colored by P&L)
│       ├── PnlChart (line chart from portfolio_snapshots)
│       └── PositionsTable (tabular positions with P&L)
│
└── ChatPanel (collapsible sidebar, right-docked)
    ├── MessageList (scrolling conversation)
    │   └── ChatMessage[] (user/assistant, inline trade confirmations)
    └── ChatInput (message input + send button)
```

### Frontend State Architecture

Use React's built-in state management (no Redux/Zustand needed for this scale):

```
Custom Hooks:
├── usePrices()         — SSE connection, price state, connection status
│   Returns: {prices: Map<ticker, PriceUpdate>, connectionStatus}
│   Side effect: accumulates price history per ticker for sparklines
│
├── usePortfolio()      — fetch + refresh portfolio state
│   Returns: {positions, cash, totalValue, refresh()}
│
├── useWatchlist()      — fetch + add/remove tickers
│   Returns: {watchlist, addTicker(), removeTicker()}
│
├── useChat()           — send messages, load history
│   Returns: {messages, sendMessage(), isLoading}
│
└── useTrade()          — execute trades
    Returns: {executeTrade(), isSubmitting}
```

**Key principle:** The `usePrices()` hook is the real-time backbone. It maintains an SSE connection and a `Map<string, PriceUpdate>` that updates on every event. Other components read from this map reactively. Portfolio values and watchlist prices are enriched with live prices from this same source.

### SSE Integration Pattern

```typescript
// lib/use-prices.ts (custom hook)
function usePrices() {
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const historyRef = useRef<Map<string, number[]>>(new Map()); // for sparklines

  useEffect(() => {
    const es = new EventSource('/api/stream/prices');

    es.onopen = () => setStatus('connected');
    es.onerror = () => setStatus('disconnected');  // EventSource auto-retries

    es.onmessage = (event) => {
      const data = JSON.parse(event.data); // {AAPL: {...}, GOOGL: {...}, ...}
      setPrices(prev => {
        const next = new Map(prev);
        for (const [ticker, update] of Object.entries(data)) {
          next.set(ticker, update as PriceUpdate);
          // Accumulate history for sparklines
          const hist = historyRef.current.get(ticker) || [];
          hist.push((update as PriceUpdate).price);
          if (hist.length > 100) hist.shift(); // cap at 100 points
          historyRef.current.set(ticker, hist);
        }
        return next;
      });
      setStatus('connected');
    };

    return () => es.close();
  }, []);

  return { prices, status, priceHistory: historyRef.current };
}
```

### Static Export Constraints

Next.js `output: 'export'` produces pure static HTML/JS/CSS. This means:

- **No `getServerSideProps` or `getStaticProps` with revalidation** -- all data fetching happens client-side
- **No API routes in Next.js** -- all API calls go to the FastAPI backend at the same origin (`/api/*`)
- **No `next/image` optimization** -- use standard `<img>` tags or inline SVGs
- **No middleware** -- no Next.js middleware for auth/redirects (not needed since no auth)
- **Single page app behavior** -- the entire app is essentially `app/page.tsx` with client-side components

This is the correct approach. The frontend is purely a rendering/interaction layer. All logic lives in the backend.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Duplicating Trade Logic in Frontend
**What:** Implementing validation rules (sufficient cash, shares) in frontend JavaScript.
**Why bad:** Creates two sources of truth. Backend already validates. Frontend should optimistically submit and handle error responses.
**Instead:** Submit trades, display backend error messages if validation fails.

### Anti-Pattern 2: Polling REST Endpoints for Price Updates
**What:** Using `setInterval` to fetch `/api/watchlist` or `/api/portfolio` repeatedly.
**Why bad:** SSE stream already pushes all price data. Polling adds unnecessary load and latency.
**Instead:** Use SSE for prices. Only call REST endpoints on user actions (trade, watchlist change) or on initial load.

### Anti-Pattern 3: Over-Engineering Frontend State
**What:** Using Redux, MobX, or complex state management for 4-5 pieces of state.
**Why bad:** This is a single-page app with one user. React hooks + context (if needed at all) are sufficient.
**Instead:** Custom hooks per domain (`usePrices`, `usePortfolio`, `useWatchlist`, `useChat`). Pass data as props.

### Anti-Pattern 4: Opening Multiple DB Connections Per Request
**What:** The current DB layer opens and closes a connection for each repository function call.
**Why bad (context):** For trade execution, a single request can make 5+ sequential DB calls, each opening/closing a connection. This is technically correct for SQLite (connections are cheap) but should be watched if request latency becomes noticeable.
**Mitigation:** Acceptable for the current scale. If needed later, a connection-per-request pattern with dependency injection would be the improvement.

### Anti-Pattern 5: LLM Watchlist Changes Not Syncing to MarketDataSource
**What:** When the LLM adds/removes tickers via `_execute_actions()`, it writes to the DB but does NOT call `source.add_ticker()` or `source.remove_ticker()` on the MarketDataSource.
**Why this matters:** The watchlist route handlers correctly update both DB and MarketDataSource, but the LLM action executor only updates the DB. A ticker added by the LLM will appear in the watchlist but won't have price data until the app restarts.
**Fix:** Pass the market source to `_execute_actions()` and call `add_ticker()`/`remove_ticker()` alongside DB operations, mirroring the watchlist route behavior.

## Patterns to Follow

### Pattern 1: Shared PriceCache as Integration Hub
**What:** The PriceCache is the single source of truth for current prices, read by every component that needs price data.
**When:** Always. Never bypass the cache to query the MarketDataSource directly.
**Why it works:** Decouples producers (simulator/Massive) from consumers (SSE, portfolio, trades, LLM). Thread-safe with version counter for efficient change detection.

### Pattern 2: Backend Owns All Business Logic
**What:** All trade execution, validation, P&L calculation, and LLM interaction happen in the Python backend. The frontend is purely a display and input layer.
**When:** Every feature. The frontend never computes whether a trade is valid -- it submits and handles the response.
**Why it works:** Single source of truth. Testable with pytest. No state synchronization bugs between frontend and backend.

### Pattern 3: Environment-Driven Feature Selection (Strategy Pattern)
**What:** The `create_market_data_source()` factory selects the implementation based on `MASSIVE_API_KEY`. The LLM service checks `LLM_MOCK` to select mock vs real LLM.
**When:** Any behavior that should differ between environments (dev, test, production).
**Why it works:** Same code paths, different implementations. Tests use mocks deterministically. Production uses real services. No conditional logic scattered throughout the app.

### Pattern 4: Lifespan-Managed Resources
**What:** FastAPI's async context manager lifespan handles startup/shutdown of background tasks, DB initialization, and market data source lifecycle.
**When:** Any resource that needs cleanup (background tasks, connections, data sources).
**Why it works:** Guarantees cleanup on shutdown. No orphaned background tasks. Centralized initialization order.

### Pattern 5: Optimistic Frontend Updates with Backend Reconciliation
**What:** After a trade, the frontend can optimistically update local state (flash the new cash balance, add position row) while awaiting the response, then reconcile with the actual backend response.
**When:** Trade execution, watchlist changes.
**Why it works:** Feels instant. Backend response corrects any discrepancy.

## Suggested Build Order (Dependencies)

The build order is driven by component dependencies. Each phase should produce testable, demonstrable functionality.

### Phase 1: Database and Portfolio Backend (no frontend dependency)
**Why first:** The DB layer and portfolio routes already exist in code but need validation. The snapshot loop, trade execution, and portfolio queries are foundational -- every subsequent phase reads from them.
- Validate and fix the DB layer (connection management, schema, seed data)
- Validate portfolio trade execution (buy/sell, edge cases, P&L math)
- Validate watchlist CRUD
- Validate snapshot recording
- Write/run unit tests for all DB operations and portfolio routes
- **Bug fix:** LLM watchlist actions not syncing to MarketDataSource

### Phase 2: LLM Chat Integration (depends on Phase 1)
**Why second:** Chat requires working portfolio state and watchlist to build context. The LLM service already exists but needs validation with real OpenRouter calls.
- Validate LLM service with real API calls (structured output parsing, error handling)
- Validate mock mode for testing
- Validate auto-execution of trades and watchlist changes
- Ensure context building includes accurate portfolio state
- Write/run unit tests for LLM service

### Phase 3: Frontend Shell (depends on Phase 1 for API contract)
**Why third:** With backend APIs validated, the frontend can be built against known-good contracts. Start with the SSE integration and watchlist (the most visually impressive part).
- Initialize Next.js project with static export configuration
- Implement SSE connection hook (`usePrices`)
- Build Watchlist panel with live prices, flash animations, sparklines
- Build Header with portfolio value and connection status
- Set up Tailwind with dark theme configuration

### Phase 4: Frontend Trading and Portfolio (depends on Phase 3)
**Why fourth:** Builds on the frontend shell with portfolio visualization and trading capabilities.
- Build PositionsTable with live P&L
- Build PortfolioHeatmap (treemap)
- Build PnlChart (line chart from snapshots)
- Build TradeBar (buy/sell interface)
- Build PriceChart (main chart for selected ticker)

### Phase 5: Frontend Chat Panel (depends on Phase 2, Phase 3)
**Why fifth:** Chat is the most complex frontend component (streaming messages, inline action confirmations, loading states) and depends on a working LLM backend.
- Build ChatPanel with message history
- Implement inline trade/watchlist action confirmations
- Loading indicator during LLM calls
- Scrolling conversation with auto-scroll

### Phase 6: Docker Integration and E2E Tests (depends on all above)
**Why last:** Requires both frontend and backend to be complete. Tests the full stack end-to-end.
- Build and test multi-stage Dockerfile
- Validate start/stop scripts
- Run Playwright E2E tests against containerized app
- Fix any integration issues discovered during E2E

### Dependency Graph

```
Phase 1 (DB + Portfolio Backend)
    │
    ├──> Phase 2 (LLM Chat Backend)
    │         │
    │         └──> Phase 5 (Chat Frontend)
    │
    └──> Phase 3 (Frontend Shell)
              │
              ├──> Phase 4 (Trading + Portfolio Frontend)
              │
              └──> Phase 5 (Chat Frontend)
                        │
                        └──> Phase 6 (Docker + E2E)
```

Phases 3 and 2 can be built in parallel after Phase 1 completes, since they have no dependency on each other.

## Scalability Considerations

| Concern | Current (1 user) | At 10 users | At 1000 users |
|---------|-------------------|-------------|---------------|
| Price updates | PriceCache in-memory, single writer | Same -- PriceCache is thread-safe | Need Redis or shared cache |
| SSE connections | One EventSource | 10 SSE connections -- FastAPI handles fine | Need SSE fanout service or WebSocket upgrade |
| SQLite writes | Single-threaded, WAL mode | Contention on writes (WAL helps) | Need PostgreSQL |
| LLM calls | Sequential per user | Multiple concurrent calls to OpenRouter | Need request queuing, rate limiting |
| Portfolio snapshots | One snapshot set per 30s | Same snapshot loop, multiple users | Batch snapshot computation |

**For this project:** Scalability is irrelevant. Single-user, no auth, demonstration project. The architecture is cleanly separated enough that upgrading individual components (SQLite -> Postgres, in-memory cache -> Redis) would be localized changes.

## Key Integration Points

### PriceCache as the Central Bus

```
                  ┌─────────────┐
                  │  PriceCache │
                  │  (in-mem)   │
                  └──────┬──────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────v────┐    ┌──────v──────┐   ┌─────v──────┐
   │ SSE     │    │ Portfolio   │   │ LLM        │
   │ Stream  │    │ Valuation   │   │ Context    │
   │ (push)  │    │ (pull)      │   │ Builder    │
   └─────────┘    └─────────────┘   └────────────┘
```

Every component that needs current prices reads from PriceCache. This is the single most important architectural decision -- it eliminates price inconsistency between what the user sees (SSE) and what the backend uses for trades.

### SQLite as the Durable State Store

```
                  ┌─────────────┐
                  │   SQLite    │
                  │  (on disk)  │
                  └──────┬──────┘
                         │
    ┌────────┬───────────┼───────────┬──────────┐
    │        │           │           │          │
  users   positions   watchlist   trades   chat_messages
 profile    │            │          │          │
    │    ┌───┘     ┌─────┘    (append    (append
    │    │         │          only)      only)
    v    v         v
 Portfolio    Watchlist      portfolio_snapshots
 Routes       Routes         (append only)
              + LLM
              Actions
```

The DB layer uses a simple repository pattern with async functions. No ORM (aiosqlite with raw SQL). This is appropriate for the project size -- an ORM would add complexity without meaningful benefit for 6 tables.

## Sources

- Direct codebase analysis of `backend/app/` (HIGH confidence -- primary source)
- `planning/PLAN.md` specification document (HIGH confidence -- project requirements)
- `planning/MARKET_DATA_SUMMARY.md` (HIGH confidence -- Phase 0 completion report)
- `.planning/PROJECT.md` (HIGH confidence -- project context)
- Next.js static export documentation for constraint identification (MEDIUM confidence -- based on training data, not verified against current docs)
