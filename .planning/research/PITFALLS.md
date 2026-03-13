# Domain Pitfalls

**Domain:** AI-powered trading workstation (simulated portfolio, LLM chat with auto-trade-execution, real-time SSE frontend, single-container Docker)
**Researched:** 2026-03-13
**Overall Confidence:** HIGH (based on code analysis of existing codebase + deep domain expertise in SQLite concurrency, SSE streaming, LLM integration, and Next.js static exports)

---

## Critical Pitfalls

Mistakes that cause data corruption, broken UX, or require architectural rewrites.

---

### Pitfall 1: SQLite Race Conditions in Trade Execution (Read-Modify-Write Without Transactions)

**What goes wrong:** The current `execute_trade` route (and the identical logic in `_execute_actions` in the LLM service) performs a multi-step read-modify-write sequence across separate database connections: read cash balance, read position, update cash, update position, insert trade. Each step opens and closes a new `aiosqlite` connection (see `repository.py` -- every function calls `get_connection()` then `db.close()` in a `finally` block). If two requests arrive nearly simultaneously (e.g., a manual trade + an LLM-triggered trade), they can both read the same cash balance, both pass validation, and both deduct cash -- resulting in a negative balance. This is a classic TOCTOU (time-of-check-to-time-of-use) bug.

**Why it happens:** The `repository.py` pattern of open-use-close per function call means there is no transaction wrapping the full trade operation. SQLite WAL mode allows concurrent reads but serializes writes, so two concurrent reads of cash will both see the old value before either write lands.

**Consequences:**
- Negative cash balances (buying more than owned)
- Phantom positions (selling shares twice)
- P&L calculations become permanently wrong
- Portfolio snapshots diverge from actual state

**Warning signs:**
- Chat endpoint and manual trade endpoint can fire simultaneously
- LLM auto-execution processes multiple trades in a loop, each checking cash separately
- Tests pass because they run sequentially; bugs only appear under concurrent load

**Prevention:**
1. Wrap the entire trade execution (read cash + read position + update cash + update position + insert trade) in a single database connection with an explicit `BEGIN IMMEDIATE` transaction. `BEGIN IMMEDIATE` acquires a write lock at the start, preventing concurrent modifications.
2. Extract trade execution into a single repository function that holds one connection throughout.
3. Alternatively, use a single `aiosqlite` connection pool (or even a single connection with a queue) rather than the open-close-per-call pattern.

**Detection:** Write a pytest test that fires two concurrent buy operations for the same amount that would exceed the balance if both succeed. Verify only one succeeds.

**Which phase should address it:** The database/portfolio phase -- this must be fixed before LLM auto-execution is wired up, since the LLM can trigger multiple trades in rapid succession.

---

### Pitfall 2: Duplicated Trade Logic Between Portfolio Route and LLM Service

**What goes wrong:** The trade execution logic in `routes/portfolio.py` (lines 69-143) is copy-pasted into `llm/service.py` (lines 125-217). Any bug fix, validation rule, or behavior change must be applied in both places. They will inevitably drift apart.

**Why it happens:** The LLM service needed to execute trades but the trade logic was embedded in an HTTP route handler rather than extracted into a reusable service function.

**Consequences:**
- One path gets a fix, the other doesn't (e.g., floating point rounding, negative quantity handling)
- Different error message formats between manual and LLM trades
- Testing burden doubles -- must verify both code paths independently
- Eventually one path has features the other lacks (e.g., trade limits)

**Warning signs:**
- When you fix a bug in trade execution and realize you need to fix it in two places
- PR reviews that ask "did you update the other trade path too?"

**Prevention:**
1. Extract trade execution into a standalone service function (e.g., `app/services/trade.py`) that both the portfolio route and the LLM service call.
2. The route handler becomes a thin wrapper: validate HTTP input, call service, format response.
3. The LLM `_execute_actions` becomes a thin loop calling the same service.

**Detection:** Diff the two trade execution code blocks. If they have diverged at all, consolidation is overdue.

**Which phase should address it:** The portfolio/database phase, before the LLM integration phase. Refactor trade logic into a service layer during portfolio implementation.

---

### Pitfall 3: SSE Memory Leak From Unbounded Sparkline Data Accumulation

**What goes wrong:** The plan specifies that sparklines are "accumulated on the frontend from the SSE stream since page load." If a user keeps the tab open for hours, the frontend accumulates price history arrays that grow without bound. At ~2 updates/second for 10 tickers, that is 72,000 data points per hour. After 8 hours, each ticker holds 57,600 entries, and with 10 tickers the frontend is holding 576,000 price objects in memory.

**Why it happens:** Developers implement append-only arrays for sparkline data and never add a cap, because it works fine during 5-minute development sessions.

**Consequences:**
- Browser tab memory usage grows linearly with time, eventually causing jank and crashes
- Canvas rendering of sparklines slows as data arrays grow (even with efficient libraries)
- React re-renders become expensive if sparkline arrays are in state without windowing

**Warning signs:**
- Memory usage in Chrome DevTools increasing steadily
- Sparkline rendering time increasing over time
- Tab crashes after being open for extended periods

**Prevention:**
1. Cap sparkline arrays at a fixed window size (e.g., last 200 data points per ticker). Use a ring buffer or simply `array.slice(-MAX_POINTS)` when appending.
2. For the main chart area (selected ticker detail), consider a larger window (500-1000 points) but still bounded.
3. Use `useRef` (not `useState`) for sparkline data if the component manages its own rendering via canvas, to avoid React re-render overhead.

**Detection:** Open Chrome DevTools, monitor memory over 30+ minutes of streaming. Memory should plateau, not grow linearly.

**Which phase should address it:** The frontend phase, specifically when implementing the sparkline components.

---

### Pitfall 4: LLM Structured Output Parsing Failures Silently Swallowed

**What goes wrong:** The current LLM service (line 248-254) catches `Exception` broadly when the LLM call fails, logs it, and returns a generic error message. But the failure modes are nuanced:
- The LLM might return valid JSON that doesn't match the Pydantic schema (e.g., `quantity` as a string)
- The LLM might return the JSON wrapped in markdown code fences
- The LLM might include extra fields or nested objects
- OpenRouter might return a 429 rate limit or 503 upstream error
- Cerebras inference might time out

Each of these deserves different handling, but they all collapse into the same generic "Sorry, I encountered an error" message.

**Why it happens:** During initial development, the broad except feels pragmatic ("just ship it, handle errors later"). But once deployed, users see cryptic failures and have no idea what went wrong.

**Consequences:**
- Users think the AI is broken when it is a transient rate limit
- Retries aren't attempted for transient errors (429, 503, timeout)
- Malformed JSON from the LLM is a permanent failure when a simple retry might succeed
- No distinction between "LLM is down" and "LLM gave bad output" makes debugging hard

**Warning signs:**
- Users reporting "the AI doesn't work" intermittently
- Logs full of swallowed exceptions with no categorization
- No retry logic anywhere in the call chain

**Prevention:**
1. Separate exception handling: `litellm` errors (API/network) vs. JSON parsing errors (Pydantic `ValidationError`) vs. unexpected errors.
2. For transient API errors (429, 503, timeout): retry once with exponential backoff before giving up.
3. For JSON parsing errors: attempt to extract JSON from markdown code fences before retrying; if still failing, try a regex extraction of the JSON object.
4. Return error type in the response so the frontend can show contextual messages ("The AI is temporarily busy, please retry" vs. "The AI gave an unexpected response").
5. Log the raw LLM response content on parse failures for debugging.

**Detection:** Check logs for exception frequency and types. Add structured logging that categorizes error types.

**Which phase should address it:** The LLM integration phase. Build robust error handling from the start rather than retrofitting.

---

### Pitfall 5: Price Stale After Watchlist Add (Ticker Not Streaming Yet When Trade Requested)

**What goes wrong:** When a user adds a new ticker to the watchlist (or the LLM adds one), the `add_ticker` route calls `source.add_ticker()` which starts generating prices for that ticker. But there is a race: the user (or LLM) might immediately try to trade the newly added ticker before the first price arrives in the `PriceCache`. The trade endpoint checks `cache.get_price(ticker)` and returns `None` -> HTTP 400 "No price available."

**Why it happens:** The market data source generates prices asynchronously (on its next tick interval, ~500ms for simulator). The watchlist add is instant, but price availability is not.

**Consequences:**
- LLM adds a ticker to the watchlist and immediately tries to buy it, fails with "no price available"
- User adds ticker, clicks buy within 500ms, gets error
- Confusing UX: the ticker is "in the watchlist" but can't be traded yet

**Warning signs:**
- LLM response includes both a `watchlist_changes` add and a `trades` buy for the same ticker
- Automated test that adds a ticker and immediately trades it fails intermittently

**Prevention:**
1. In `_execute_actions`, process `watchlist_changes` before `trades`, and add a brief `await asyncio.sleep(1.0)` after watchlist additions if any trades reference the same tickers. This is a pragmatic fix for the demo.
2. Better: have `add_ticker` on the simulator seed an initial price immediately (synchronous cache write before returning), so the price is available as soon as the ticker is added.
3. In the frontend, show newly added tickers with a "loading" state until the first SSE price arrives.

**Detection:** Test that adds PYPL to watchlist and immediately buys 1 share. Should succeed, not return "No price available."

**Which phase should address it:** This spans the watchlist/market-data boundary. Address during the watchlist API phase by ensuring the simulator seeds an initial price on `add_ticker`.

---

### Pitfall 6: EventSource Reconnection Floods After Server Restart

**What goes wrong:** The SSE endpoint sends `retry: 1000` (1-second reconnect interval). If the server restarts (e.g., during Docker container restart or code reload), all connected clients simultaneously reconnect after 1 second. With a single-user app this is fine, but the reconnection creates a thundering-herd pattern if testing with multiple tabs. More importantly, the `EventSource` reconnection doesn't re-establish any client state -- sparkline data accumulated since page load is lost.

**Why it happens:** `EventSource` auto-reconnects but starts from scratch. Developers assume reconnection "just works" without considering state loss on the client.

**Consequences:**
- Sparklines go blank after reconnection (all accumulated data lost)
- Connection status indicator may flicker or show stale state
- If the frontend doesn't handle the reconnection event, the UI might appear frozen until a manual refresh

**Warning signs:**
- Refreshing the page makes sparklines look correct, but they were empty before refresh
- SSE connection status dot shows "connected" but no price updates appear
- The `onopen` handler isn't implemented, so reconnection isn't detected

**Prevention:**
1. Implement `EventSource.onopen` handler that resets sparkline state cleanly (clear arrays, show "reconnected" indicator briefly).
2. Implement `EventSource.onerror` handler that updates the connection status indicator to yellow/red.
3. Consider storing the last N minutes of sparkline data in `sessionStorage` so a page reload doesn't lose all history (optional, nice-to-have).
4. On reconnection, show a brief "Reconnected" toast/indicator so the user knows data flow resumed.

**Detection:** Open the app, let sparklines accumulate for 2 minutes, then restart the backend. Verify the frontend recovers gracefully.

**Which phase should address it:** The frontend phase, when implementing the SSE connection manager and sparkline components.

---

## Moderate Pitfalls

---

### Pitfall 7: Floating Point Arithmetic in Portfolio P&L Calculations

**What goes wrong:** Financial calculations using JavaScript `Number` (IEEE 754 float64) or Python `float` produce rounding artifacts. For example, `0.1 + 0.2 = 0.30000000000000004`. The current codebase uses `round(x, 2)` in Python (which helps) but the frontend will do its own calculations (unrealized P&L, percentage changes) in JavaScript where there is no built-in rounding.

**Prevention:**
1. All financial calculations should happen server-side and be sent pre-calculated to the frontend.
2. The frontend should only display values, not recompute P&L from raw prices.
3. If the frontend must calculate (e.g., for real-time P&L updates between API polls), use a utility function that rounds to 2 decimal places: `Math.round(value * 100) / 100`.
4. Never compare floating-point dollar values with `===`; use epsilon comparison or integer cents.

**Which phase should address it:** Frontend phase. Create a `format.ts` utility module early with all financial formatting/rounding functions.

---

### Pitfall 8: Unbounded Portfolio Snapshots Table Growth

**What goes wrong:** The `portfolio_snapshots` table receives a new row every 30 seconds (from the background task) plus one after every trade. Over hours of use, this table grows unboundedly. After 24 hours of continuous use: 2,880 snapshots from the timer alone. The P&L chart query fetches all snapshots with `ORDER BY recorded_at` and no limit.

**Prevention:**
1. Add a `LIMIT` to the `get_portfolio_history` query (e.g., last 500 snapshots). This keeps the P&L chart responsive and bounds the JSON payload size.
2. Consider adding a cleanup task that prunes snapshots older than 24 hours, or downsamples old snapshots (keep every 10th entry for data older than 1 hour).
3. Add an index on `(user_id, recorded_at)` to the `portfolio_snapshots` table for query performance.

**Which phase should address it:** Database phase, during schema and repository implementation.

---

### Pitfall 9: Chat History Context Window Overflow

**What goes wrong:** The LLM service sends the last 20 chat messages as conversation history. But each message includes the full system prompt with portfolio context. If the user has been chatting actively, the token count of 20 messages + system prompt + portfolio context can exceed the LLM's context window or cause unexpectedly high API costs.

**Prevention:**
1. Count approximate tokens before sending (rough estimate: 1 token per 4 characters). If approaching context limits, truncate older messages first.
2. Only include `content` from history messages, not `actions` JSON -- the LLM doesn't need to see past trade execution details.
3. Consider summarizing older messages rather than sending them verbatim.
4. The current limit of 20 is reasonable for the demo, but monitor token usage in logs.

**Which phase should address it:** LLM integration phase. Include token estimation in the message builder.

---

### Pitfall 10: Next.js Static Export Missing Dynamic Routes and API Rewrites

**What goes wrong:** Next.js `output: 'export'` produces flat HTML/JS/CSS files with no server-side rendering and no API routes. Common mistakes:
- Using `next/image` with the default loader (requires a server) -- must use `unoptimized: true` in `next.config.ts`
- Using `next/link` with dynamic routes that need `generateStaticParams` but aren't configured
- Expecting `rewrites` or `redirects` in `next.config.ts` to work (they don't with static export)
- Using `cookies()` or `headers()` from `next/headers` (server-only APIs)
- Leaving `<Image>` components that reference external URLs without `remotePatterns` config

**Prevention:**
1. Set `output: 'export'` and `images: { unoptimized: true }` in `next.config.ts` from the start.
2. Test with `next build && npx serve out` locally before integrating with the Docker build.
3. Only use client components (`'use client'`) -- there is no server in production.
4. All data fetching must use `fetch`/`axios` in `useEffect` or React Query, not server components or server actions.
5. Verify the build succeeds with `output: 'export'` after every new page/component is added.

**Which phase should address it:** Frontend phase, in the initial Next.js project setup. Get the static export working before building any components.

---

### Pitfall 11: Docker Multi-Stage Build Cache Invalidation

**What goes wrong:** In a multi-stage Dockerfile, if `package.json` and `package-lock.json` are copied after all source files, every code change invalidates the `npm install` layer cache, causing a full reinstall on every build. The same applies to the Python stage with `pyproject.toml` and `uv.lock`.

**Prevention:**
1. Copy dependency files first, install, then copy source:
   ```dockerfile
   # Stage 1: Frontend
   COPY frontend/package.json frontend/package-lock.json ./
   RUN npm ci
   COPY frontend/ ./
   RUN npm run build

   # Stage 2: Backend
   COPY backend/pyproject.toml backend/uv.lock ./
   RUN uv sync --no-dev
   COPY backend/ ./
   ```
2. Use `npm ci` (not `npm install`) for deterministic installs from the lockfile.
3. Use `.dockerignore` to exclude `node_modules/`, `.venv/`, `__pycache__/`, `db/finally.db`.

**Which phase should address it:** Docker/deployment phase. Get the Dockerfile right on the first attempt -- rebuilding the image during development happens frequently.

---

### Pitfall 12: LLM Adds Ticker to Watchlist But Market Data Source Not Updated

**What goes wrong:** The watchlist route correctly calls `source.add_ticker()` after adding to the database. But the LLM's `_execute_actions` only calls `add_to_watchlist()` (the DB function) and does NOT call `source.add_ticker()`. This means tickers added by the LLM appear in the watchlist database but never start streaming prices. The SSE stream won't include them, and trades on them will fail with "No price available."

**Why it happens:** The LLM service only has access to `PriceCache` (for reading prices), not the `MarketDataSource` (for adding tickers). The watchlist route handler has access to both via `request.app.state`.

**Consequences:**
- LLM says "I've added PYPL to your watchlist" but PYPL never streams prices
- User sees PYPL in watchlist with null price forever
- User cannot trade PYPL despite it being "watched"

**Warning signs:**
- LLM-added tickers show `null` for price in the watchlist API response
- Trading LLM-added tickers always fails

**Prevention:**
1. Pass the `MarketDataSource` to the LLM service (alongside `PriceCache`) so `_execute_actions` can call `source.add_ticker()` and `source.remove_ticker()`.
2. Alternatively, create a higher-level `WatchlistService` that encapsulates both DB write + market data source update, used by both the route and the LLM service.

**Detection:** Test: send chat message "watch PYPL", verify PYPL appears in SSE stream within 2 seconds.

**Which phase should address it:** LLM integration phase. This is a wiring issue that becomes apparent during integration testing.

---

### Pitfall 13: Price Flash Animation Fires on Every SSE Message, Not Just Changes

**What goes wrong:** The SSE stream pushes all prices every 500ms. If the frontend applies a flash animation (green/red background) on every received price, the animations fire continuously even when prices haven't changed. This creates a distracting, noisy UI where everything is always flashing.

**Prevention:**
1. Compare the received price to the previously displayed price on the frontend. Only trigger the flash animation when the price actually changed.
2. The `PriceUpdate` model already includes `direction` ("up"/"down"/"flat"). Use `direction` to determine flash color, but only apply the flash when `direction !== "flat"` AND the price differs from the last rendered price.
3. Debounce rapid direction changes -- if a price ticks up then down within 100ms, don't flash twice.

**Which phase should address it:** Frontend phase, when implementing the watchlist price display component.

---

### Pitfall 14: FastAPI Static File Mount Catches All Routes Including 404s

**What goes wrong:** The current `main.py` mounts static files with `app.mount("/", StaticFiles(..., html=True))`. The `html=True` parameter causes FastAPI to serve `index.html` for any unmatched path. This means:
- API 404s (e.g., `/api/nonexistent`) might be caught by the static mount if the mount processes first
- If the Next.js static export creates files at paths that conflict with API routes, the static file wins

**Prevention:**
1. The current code correctly mounts static files LAST (after API routes), so `/api/*` routes take priority. Verify this ordering is maintained as the app grows.
2. Add explicit 404 handling for `/api/*` paths that don't match any route.
3. Test that `/api/nonexistent` returns a JSON 404, not an HTML page.

**Which phase should address it:** Docker/integration phase, when wiring frontend static files to the backend.

---

## Minor Pitfalls

---

### Pitfall 15: Treemap/Heatmap With Zero or One Position Renders Awkwardly

**What goes wrong:** Portfolio heatmap (treemap) libraries expect multiple data points with varying sizes. Edge cases:
- Zero positions: empty treemap looks like a bug
- One position: single rectangle fills the entire area (uninformative)
- Position with zero market value: division by zero when calculating portfolio weight

**Prevention:**
1. Show a placeholder ("No positions yet -- buy some stocks!") when positions are empty.
2. For single positions, still render the treemap but add a "Cash" block to show portfolio composition.
3. Guard against division by zero in weight calculations.

**Which phase should address it:** Frontend phase, when implementing the portfolio heatmap component.

---

### Pitfall 16: ISO Timestamp String Comparison in SQLite

**What goes wrong:** SQLite stores timestamps as TEXT (ISO format). String comparison of ISO timestamps works correctly for ordering ONLY if all timestamps use the same format (including timezone). The codebase uses `datetime.now(timezone.utc).isoformat()` which produces `2026-03-13T10:30:00+00:00`. If any code path accidentally uses naive timestamps (without timezone), the sorting breaks subtly.

**Prevention:**
1. The existing `_now()` helper in `repository.py` is correct and consistent -- always use it.
2. Never use `datetime.now()` without `timezone.utc` anywhere in the codebase.
3. Consider a linter rule or code review checklist item for this.

**Which phase should address it:** Already mitigated by the existing `_now()` helper. Just be vigilant about consistency.

---

### Pitfall 17: Frontend Polling vs. Stale Data After Trade Execution

**What goes wrong:** The frontend receives price updates via SSE, but portfolio state (positions, cash, P&L) comes from REST API calls. After executing a trade, the frontend must re-fetch portfolio data. If the UI doesn't re-fetch or uses stale cached data, the positions table and heatmap show pre-trade values.

**Prevention:**
1. After every successful trade (manual or from chat), immediately re-fetch `/api/portfolio`.
2. Use a React state management approach (React Query with `invalidateQueries`, or a custom hook with `refetch`) that makes invalidation automatic.
3. The trade response already includes `cash` and `total_value` -- use these for immediate optimistic UI update, then confirm with a full portfolio refetch.
4. Consider having the chat response also trigger a portfolio refetch, since LLM trades modify portfolio state.

**Which phase should address it:** Frontend phase, when implementing the trade bar and chat panel components.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Database / Portfolio | Race condition in concurrent trades (Pitfall 1) | CRITICAL | Wrap trade execution in single-connection transaction with `BEGIN IMMEDIATE` |
| Database / Portfolio | Duplicated trade logic (Pitfall 2) | CRITICAL | Extract into shared service function before building LLM integration |
| Database / Portfolio | Unbounded snapshots table (Pitfall 8) | MODERATE | Add query limits and consider pruning strategy |
| LLM Integration | Structured output parse failures (Pitfall 4) | CRITICAL | Categorize errors, add retry for transient failures |
| LLM Integration | Watchlist changes not wired to market source (Pitfall 12) | MODERATE | Pass MarketDataSource to LLM service or use shared WatchlistService |
| LLM Integration | Price stale after watchlist add (Pitfall 5) | MODERATE | Seed initial price on add_ticker in simulator |
| LLM Integration | Chat context window overflow (Pitfall 9) | MODERATE | Estimate tokens, truncate oldest messages first |
| Frontend / SSE | Sparkline memory leak (Pitfall 3) | CRITICAL | Cap arrays at fixed window (200 points) |
| Frontend / SSE | Reconnection state loss (Pitfall 6) | MODERATE | Handle onopen/onerror, clear sparklines on reconnect |
| Frontend / SSE | Flash animation fires on unchanged prices (Pitfall 13) | MODERATE | Compare to previous price before triggering flash |
| Frontend / Charts | Treemap edge cases (Pitfall 15) | MINOR | Placeholder for empty, cash block for single position |
| Frontend / Data | Stale portfolio after trade (Pitfall 17) | MODERATE | Refetch portfolio after every trade, use React Query invalidation |
| Frontend / Setup | Next.js static export gotchas (Pitfall 10) | MODERATE | Set output: export + unoptimized images from day one |
| Frontend / Setup | Floating point P&L in JavaScript (Pitfall 7) | MODERATE | Server-side calculations, utility rounding functions |
| Docker | Build cache invalidation (Pitfall 11) | MINOR | Copy dependency files before source in each stage |
| Docker | Static mount route conflicts (Pitfall 14) | MINOR | Maintain API route priority, test 404 behavior |

---

## Sources

- **Code analysis:** Direct review of `backend/app/` source code in the FinAlly repository -- `repository.py`, `portfolio.py`, `service.py`, `stream.py`, `cache.py`, `main.py`, `watchlist.py`, `chat.py`, `mock.py`, `models.py`, `connection.py`, `schema.py`
- **SQLite concurrency:** Known WAL mode behavior -- concurrent reads allowed, writes serialized; `BEGIN IMMEDIATE` required for read-modify-write atomicity (SQLite documentation)
- **aiosqlite patterns:** Each connection is independent; no built-in connection pooling (aiosqlite project documentation)
- **SSE/EventSource:** Browser EventSource API auto-reconnects but resets state; retry directive controls reconnect interval (MDN Web Docs, WHATWG HTML spec)
- **Next.js static export:** `output: 'export'` limitations are documented in Next.js official docs -- no server-side features, no Image optimization without `unoptimized: true`
- **LiteLLM structured outputs:** `response_format` with Pydantic models; error handling varies by provider (LiteLLM documentation)
- **Confidence:** HIGH for pitfalls identified through direct code analysis (1, 2, 3, 5, 6, 10, 11, 12, 13, 14); MEDIUM for pitfalls based on domain patterns not yet observable in code (4, 7, 8, 9, 15, 16, 17)
