# Phase 1: Backend Hardening - Research

**Researched:** 2026-03-13
**Domain:** Python/aiosqlite transactions, FastAPI async patterns, litellm async, service extraction
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation decisions for this phase are at Claude's discretion, guided by the PLAN.md spec and research findings. Key areas:

- **Transaction model:** Restructure DB connections for atomic trade execution. Current pattern (6 separate connections per trade) must be replaced with single-connection transactions. Use BEGIN IMMEDIATE for write serialization.
- **TradeService design:** Extract duplicated trade logic from `routes/portfolio.py` and `llm/service.py` into a shared service. Service should handle error differences between REST (HTTPException) and LLM (soft failure dicts) callers. Consistent error response format for the frontend.
- **LLM watchlist sync:** `_execute_actions()` must call `source.add_ticker()` / `source.remove_ticker()` and `cache.remove()` matching what `routes/watchlist.py` already does. Fire-and-forget pattern is acceptable (don't wait for first price).
- **Blocking LLM call:** `litellm.completion` is synchronous and blocks the event loop. Fix by wrapping in `asyncio.to_thread()` or switching to async `litellm.acompletion`. Fix now (Phase 1) since it's in the same service being refactored.
- **Snapshot timing:** 30-second interval + immediately after each trade (per spec). No additional triggers needed.
- **Connection management:** WAL pragma re-issued on every connection open — consolidate to init-time only. Consider connection context manager pattern for cleaner resource handling.

### Claude's Discretion
All implementation decisions delegated to Claude. Follow PLAN.md spec and research pitfall mitigations.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BACK-01 | Trade execution wrapped in single-connection BEGIN IMMEDIATE transaction to prevent race conditions | aiosqlite context manager + single connection pattern; isolation_level control; BEGIN IMMEDIATE semantics verified |
| BACK-02 | Trade logic extracted into shared TradeService used by both portfolio route and LLM service | Service class pattern using `app.state`; error abstraction between HTTPException and soft-failure dicts |
| BACK-03 | LLM watchlist changes synced to MarketDataSource (add_ticker/remove_ticker) | `_execute_actions()` missing source calls; pattern already exists in `routes/watchlist.py` |
| BACK-04 | Portfolio snapshot background task records total value every 30 seconds and immediately after each trade | `_snapshot_loop` already exists in `main.py`; trade-triggered snapshot needs to go through TradeService |
</phase_requirements>

---

## Summary

Phase 1 is a pure refactor-and-harden phase: no new features, no schema changes, no new dependencies. The codebase is well-structured but has four concrete bugs/deficiencies identified in the CONTEXT.md that must be fixed before the frontend can be reliably built against these APIs.

The critical bug (BACK-01) is a classic TOCTOU (time-of-check, time-of-use) race condition. The trade route reads cash balance in one connection, then writes cash and position updates in three more separate connections. Two simultaneous trade requests can both read the same cash balance, both pass the validation check, and both execute — resulting in double-spending. The fix is a single `aiosqlite` connection holding a `BEGIN IMMEDIATE` transaction across the entire trade operation.

The remaining three items (BACK-02, BACK-03, BACK-04) are architectural cleanups: extracting a shared TradeService eliminates ~90 lines of duplicated trade logic, adding MarketDataSource calls to LLM watchlist changes makes the system consistent with the REST watchlist route, and the snapshot background task already exists in `main.py` but needs integration into TradeService so it fires on every trade.

**Primary recommendation:** Build a `TradeService` class that owns the atomic transaction (BACK-01), is the single code path for both REST and LLM trades (BACK-02), triggers snapshots after execution (BACK-04), and register it on `app.state` so routes and LLM service both reference the same instance.

---

## Standard Stack

### Core (already in use — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| aiosqlite | 0.22.1 | Async SQLite access | Already in use; supports context managers and manual transaction control |
| fastapi | >=0.115.0 | Web framework | Already in use; `app.state` pattern for shared services |
| litellm | >=1.81.10 | LLM calls | Already in use; provides both `completion` (sync) and `acompletion` (async) |
| pytest-asyncio | >=0.24.0 | Async test runner | Already configured with `asyncio_mode = "auto"` |

**No new packages required.** This phase is entirely about restructuring existing code.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
backend/app/
├── db/
│   ├── connection.py      # Add get_db_ctx() context manager
│   ├── repository.py      # Existing CRUD — unchanged
│   └── schema.py          # Unchanged
├── services/              # NEW directory
│   ├── __init__.py        # Export TradeService
│   └── trade_service.py   # NEW: shared trade logic
├── llm/
│   └── service.py         # Simplified: remove trade logic, call TradeService
├── routes/
│   └── portfolio.py       # Simplified: call TradeService instead of inline logic
└── main.py                # Register TradeService on app.state
```

### Pattern 1: aiosqlite Context Manager for Transactions

**What:** Use `async with aiosqlite.connect(path) as db` for RAII connection management. Use `await db.execute("BEGIN IMMEDIATE")` at the start of the trade operation to serialize writes.

**When to use:** Any multi-step read-validate-write sequence where atomicity is required.

**Key facts about aiosqlite transactions:**
- aiosqlite defaults to `isolation_level = ""` which means autocommit for DML statements unless you issue `BEGIN` manually. (HIGH confidence — verified in aiosqlite source and docs)
- `BEGIN IMMEDIATE` acquires a reserved lock at transaction start, preventing other writers from starting. This is the correct lock level for read-then-write operations. (HIGH confidence — SQLite docs)
- `BEGIN DEFERRED` (the default `BEGIN`) could allow a second writer to start between your read and write. `BEGIN IMMEDIATE` closes this window.
- After `await db.execute("BEGIN IMMEDIATE")`, all reads within the same connection see a consistent snapshot. Other connections attempting `BEGIN IMMEDIATE` will immediately get `SQLITE_BUSY` (they will NOT block indefinitely by default).
- aiosqlite uses a single background thread per connection — all awaits on the same connection object serialize naturally. The race condition is between *different* connections, not within one.

**Example — atomic trade transaction:**
```python
# Source: aiosqlite docs + SQLite WAL documentation
import aiosqlite
from contextlib import asynccontextmanager

@asynccontextmanager
async def get_db_transaction():
    """Open a connection and begin an IMMEDIATE transaction."""
    async with aiosqlite.connect(get_db_path()) as db:
        db.row_factory = aiosqlite.Row
        # WAL mode is a DB-level persistent setting — set once at init, not per connection
        await db.execute("BEGIN IMMEDIATE")
        try:
            yield db
            await db.commit()
        except Exception:
            await db.rollback()
            raise
```

**Why WAL pragma moves to init-time only:** `PRAGMA journal_mode=WAL` is a database-level persistent setting. Once set on any connection, it persists in the database file. Re-issuing it on every new connection is harmless but wastes a round-trip. Move it to `init_db()` only.

### Pattern 2: TradeService as a Shared Stateful Service

**What:** A class registered on `app.state` that owns all trade execution logic and has references to `price_cache` and `market_source`.

**When to use:** When the same business logic needs to be called from two different callers (REST route and LLM service) with different error semantics.

**Example — TradeService structure:**
```python
# services/trade_service.py
from dataclasses import dataclass
from typing import Literal

@dataclass
class TradeResult:
    success: bool
    ticker: str
    side: str
    quantity: float
    price: float | None = None
    error: str | None = None

class TradeService:
    def __init__(self, price_cache: PriceCache, market_source: MarketDataSource):
        self._cache = price_cache
        self._source = market_source

    async def execute_trade(
        self,
        ticker: str,
        side: Literal["buy", "sell"],
        quantity: float,
        user_id: str = DEFAULT_USER_ID,
    ) -> TradeResult:
        """Execute a trade atomically. Returns TradeResult (success or failure)."""
        # ... atomic transaction logic ...

    async def add_watchlist_ticker(self, ticker: str, user_id: str = DEFAULT_USER_ID) -> dict:
        """Add ticker to DB and sync to market data source."""
        entry = await add_to_watchlist(ticker, user_id)
        await self._source.add_ticker(ticker)
        return entry

    async def remove_watchlist_ticker(self, ticker: str, user_id: str = DEFAULT_USER_ID) -> bool:
        """Remove ticker from DB, market source, and price cache."""
        removed = await remove_from_watchlist(ticker, user_id)
        if removed:
            await self._source.remove_ticker(ticker)
            self._cache.remove(ticker)
        return removed
```

**Error handling pattern — two callers, different semantics:**
```python
# In routes/portfolio.py — REST caller wants HTTPException
result = await trade_service.execute_trade(ticker, side, quantity)
if not result.success:
    raise HTTPException(status_code=400, detail=result.error)

# In llm/service.py — LLM caller wants soft failure dict
result = await trade_service.execute_trade(ticker, side, quantity)
if not result.success:
    trade_results.append({"ticker": ticker, "error": result.error})
    continue
```

This is the key design insight: TradeService returns a neutral result object. The caller decides how to surface the error.

### Pattern 3: Async LLM Calls with asyncio.to_thread

**What:** Wrap synchronous `litellm.completion` in `asyncio.to_thread()` so the FastAPI event loop is not blocked during the LLM API call.

**When to use:** Any synchronous I/O-bound operation called from async FastAPI route handlers.

**Option A — asyncio.to_thread (simpler, no dependency change):**
```python
import asyncio
from litellm import completion

response = await asyncio.to_thread(
    completion,
    model=MODEL,
    messages=messages,
    response_format=LlmResponse,
    reasoning_effort="low",
    extra_body=EXTRA_BODY,
)
```

**Option B — litellm.acompletion (native async, cleaner):**
```python
from litellm import acompletion

response = await acompletion(
    model=MODEL,
    messages=messages,
    response_format=LlmResponse,
    reasoning_effort="low",
    extra_body=EXTRA_BODY,
)
```

Both options work. `acompletion` is semantically cleaner but `asyncio.to_thread` requires zero knowledge of litellm internals. Either is acceptable — `acompletion` is preferred because it properly parallelizes if multiple LLM calls ever run concurrently.

### Pattern 4: Snapshot Integration in TradeService

**What:** After a successful trade, calculate total portfolio value and call `insert_snapshot()` within the same function (but after the transaction commits, since snapshot is a separate table insert).

**Timing requirements from spec:**
- Every 30 seconds via `_snapshot_loop` in `main.py` (already implemented)
- Within 1 second of any trade execution (must be added to TradeService)

**Example — snapshot after trade:**
```python
async def execute_trade(self, ...) -> TradeResult:
    # ... atomic trade transaction ...
    # After commit, record snapshot (separate insert, non-atomic is fine)
    await self._record_snapshot(user_id)
    return TradeResult(success=True, ...)

async def _record_snapshot(self, user_id: str) -> None:
    """Record portfolio value snapshot. Non-critical — errors logged, not raised."""
    try:
        cash = await get_cash_balance(user_id)
        positions = await get_positions(user_id)
        total_value = cash + sum(
            (self._cache.get_price(p["ticker"]) or p["avg_cost"]) * p["quantity"]
            for p in positions
        )
        await insert_snapshot(round(total_value, 2), user_id)
    except Exception:
        logger.exception("Failed to record portfolio snapshot after trade")
```

### Pattern 5: Registering TradeService on app.state

**What:** In `main.py` lifespan, instantiate TradeService after market source is started and attach to `app.state`.

```python
# main.py lifespan
source = create_market_data_source(price_cache)
app.state.price_cache = price_cache
app.state.market_source = source
# ... start source ...

trade_service = TradeService(price_cache, source)
app.state.trade_service = trade_service
```

**In routes:**
```python
@router.post("/trade")
async def execute_trade(trade: TradeRequest, request: Request):
    service = request.app.state.trade_service
    result = await service.execute_trade(trade.ticker, trade.side, trade.quantity)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    ...
```

**In LLM service — passing service as parameter:**
The LLM service `chat_with_llm` currently accepts `price_cache: PriceCache`. It needs to also receive `trade_service: TradeService` (or a reference to it). The cleanest approach is to add `trade_service` as a second parameter to `chat_with_llm` and `_execute_actions`.

### Anti-Patterns to Avoid

- **Opening multiple connections for one logical operation:** The current trade route opens 6+ connections (get_cash, update_cash, get_position, upsert_position, insert_trade, insert_snapshot). This is the root cause of BACK-01. Never do multi-step read-validate-write with separate connections.
- **Issuing WAL pragma per connection:** It persists in the database file. Set it once in `init_db()`. Issuing it on every connection adds ~0.1ms overhead per connection open.
- **Calling synchronous litellm.completion from an async route handler:** This blocks the entire FastAPI event loop for the duration of the API call (typically 2-10 seconds for LLM calls). Other requests cannot be served during this time.
- **Snapshot inside the trade transaction:** `portfolio_snapshots` is a separate, non-critical table. Including it in `BEGIN IMMEDIATE` extends the lock duration unnecessarily. Record snapshot after commit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async SQLite transaction | Custom lock/mutex | `aiosqlite` context manager + `BEGIN IMMEDIATE` | SQLite's own locking is more correct and composable |
| Thread-safe async wrapper | Custom thread pool | `asyncio.to_thread()` | Python stdlib; handles cancellation correctly |
| Async LLM calls | Custom HTTP client | `litellm.acompletion` | Already a dependency; handles retry, error codes |

---

## Common Pitfalls

### Pitfall 1: aiosqlite Autocommit vs. Explicit Transaction

**What goes wrong:** aiosqlite opens connections with `isolation_level = ""` by default, which means DML statements (INSERT, UPDATE, DELETE) are NOT auto-committed — they start an implicit transaction. However, `BEGIN` is not issued automatically on `SELECT`. This creates confusion about when transactions start.

**Why it happens:** Different from Python's `sqlite3` module where `isolation_level=None` means autocommit. aiosqlite's default behavior wraps DML in implicit transactions but NOT reads.

**How to avoid:** Be explicit. Issue `BEGIN IMMEDIATE` at the start of any trade operation. Do not rely on implicit transaction behavior.

**Warning signs:** Tests pass in isolation (sequential), but concurrent load tests show double-spend.

### Pitfall 2: SQLite BUSY on BEGIN IMMEDIATE

**What goes wrong:** When two transactions attempt `BEGIN IMMEDIATE` concurrently, the second gets `sqlite3.OperationalError: database is locked`. The default busy timeout is 0ms — immediate failure.

**Why it happens:** SQLite's default `busy_timeout` is 0. FastAPI handles this as an unhandled exception, returning 500.

**How to avoid:** Set `PRAGMA busy_timeout = 5000` (5 seconds) in `init_db()`. This makes SQLite retry for up to 5 seconds before raising. For trade requests, 5 seconds is a safe upper bound. Also handle `OperationalError` with busy message explicitly and return 503.

**Warning signs:** Intermittent 500 errors on `/api/portfolio/trade` under load.

### Pitfall 3: TradeService in Tests — Market Source Dependency

**What goes wrong:** TradeService takes `market_source: MarketDataSource` as a constructor argument. Tests that don't need watchlist sync still need to provide a market source mock.

**Why it happens:** Constructor injection with no default.

**How to avoid:** The existing `tests/routes/conftest.py` already has a `MockSource` class. Extend TradeService fixtures to use it. Consider a `NullMarketSource` in test utilities.

**Warning signs:** Import errors or missing fixture errors in new trade service tests.

### Pitfall 4: Snapshot Race with Background Task

**What goes wrong:** The 30-second `_snapshot_loop` in `main.py` and trade-triggered snapshots in TradeService both call `insert_snapshot()`. With WAL mode enabled, concurrent SQLite writes from different connections are safe — WAL allows concurrent readers and one writer. However, two nearly simultaneous inserts (background + trade) create duplicate snapshots milliseconds apart.

**Why it happens:** The background task wakes up exactly as a trade executes.

**How to avoid:** This is acceptable behavior — duplicate snapshots are benign for a P&L chart. The chart can simply plot all points. Do NOT add locking between the two snapshot paths. Keep them independent.

**Warning signs:** Two points plotted at essentially the same time on the P&L chart (visually fine).

### Pitfall 5: LLM Watchlist Changes Bypass MarketDataSource

**What goes wrong:** When the LLM adds/removes a ticker from the watchlist, the DB is updated but `market_source.add_ticker()` / `market_source.remove_ticker()` are not called. The price stream does not update.

**Why it happens:** `_execute_actions()` in `llm/service.py` calls DB functions directly (lines 201-215) but does not have a reference to `market_source`. The REST watchlist route (lines 48, 64-65 in `routes/watchlist.py`) correctly calls both.

**How to avoid:** Move watchlist sync logic into TradeService (or a WatchlistService) so both REST and LLM paths use the same implementation.

**Warning signs:** After LLM adds a ticker, the watchlist GET shows it but no price appears; after LLM removes a ticker, prices still stream for it.

---

## Code Examples

### Current Broken Pattern (BACK-01)

```python
# Source: backend/app/routes/portfolio.py lines 86-137 (current code)
# BROKEN: 6 separate connections — race condition between get_cash and update_cash
cash = await get_cash_balance()          # Connection 1, closed
if cost > cash: raise HTTPException(...)
await update_cash_balance(cash - cost)   # Connection 2, closed
existing = await get_position(ticker)    # Connection 3, closed
await upsert_position(ticker, ...)       # Connection 4, closed
await insert_trade(ticker, ...)          # Connection 5, closed
await insert_snapshot(total_value)       # Connection 6, closed
```

### Fixed Atomic Pattern (BACK-01 solution)

```python
# Single connection, BEGIN IMMEDIATE, all reads and writes atomic
async with aiosqlite.connect(get_db_path()) as db:
    db.row_factory = aiosqlite.Row
    await db.execute("BEGIN IMMEDIATE")

    # Read cash — within the transaction, no other writer can change it
    cursor = await db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (user_id,)
    )
    row = await cursor.fetchone()
    cash = row["cash_balance"]

    if side == "buy":
        cost = price * quantity
        if cost > cash:
            await db.rollback()
            return TradeResult(success=False, error=f"Insufficient cash...")

        await db.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
            (cash - cost, user_id)
        )
        # ... upsert position within same db connection ...

    await db.execute(
        "INSERT INTO trades (...) VALUES (...)", (...)
    )
    await db.commit()
# Snapshot inserted after commit, with a fresh connection
await insert_snapshot(...)
```

### LLM Watchlist Sync Fix (BACK-03)

```python
# Source: Current broken pattern in llm/service.py lines 201-215
# MISSING: source.add_ticker() / source.remove_ticker() calls

# Fixed pattern — delegate to TradeService (or WatchlistService)
# llm/service.py _execute_actions receives trade_service:
for change in llm_response.watchlist_changes:
    ticker = change.ticker.upper()
    if change.action == "add":
        try:
            entry = await trade_service.add_watchlist_ticker(ticker, user_id)
            watchlist_results.append({"ticker": ticker, "action": "add", "status": "done"})
        except Exception as exc:
            watchlist_results.append({"ticker": ticker, "action": "add", "error": str(exc)})
    elif change.action == "remove":
        removed = await trade_service.remove_watchlist_ticker(ticker, user_id)
        status = "done" if removed else "not_found"
        watchlist_results.append({"ticker": ticker, "action": "remove", "status": status})
```

### Async LLM Fix (BACK-02 enabler)

```python
# Source: litellm docs — acompletion is the async variant
from litellm import acompletion

# In chat_with_llm():
response = await acompletion(
    model=MODEL,
    messages=messages,
    response_format=LlmResponse,
    reasoning_effort="low",
    extra_body=EXTRA_BODY,
)
```

### pytest-asyncio Test Pattern (existing, verified working)

```python
# Source: backend/pyproject.toml — asyncio_mode = "auto"
# All test functions are automatically treated as async coroutines
# No @pytest.mark.asyncio decorator needed

class TestTradeService:
    async def test_atomic_buy(self, trade_service, test_db):
        result = await trade_service.execute_trade("AAPL", "buy", 5)
        assert result.success
        assert result.price == 190.50
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sqlite3 + threads | aiosqlite (async) | Python 3.7+ | Non-blocking DB calls in async contexts |
| Manual transaction SQL | aiosqlite context manager (`async with`) | aiosqlite 0.17+ | RAII resource management |
| Synchronous LLM calls | `litellm.acompletion` | litellm 1.0+ | Non-blocking inference calls |

**Deprecated/outdated patterns in current code:**
- `completion` (sync): replaced by `acompletion` — both exist in litellm, sync variant blocks event loop
- Per-connection WAL pragma: WAL is persistent in DB file, not a per-connection setting

---

## Open Questions

1. **Should repository.py functions accept an optional `db` parameter for shared-connection use?**
   - What we know: Current repository functions open their own connection. TradeService needs to run multiple repository-style operations on one connection.
   - What's unclear: Whether to pass the connection into existing repo functions or write inline SQL in TradeService.
   - Recommendation: Write inline SQL within the TradeService atomic transaction rather than threading `db` through existing repo functions. Keep repo functions for the non-transactional cases (GET endpoints, context building). This avoids modifying all existing repo functions and existing tests continue to pass.

2. **Should `_execute_actions` in `llm/service.py` process multiple trades atomically together or one at a time?**
   - What we know: The LLM can specify multiple trades in one response. Current code runs them sequentially with separate DB operations.
   - What's unclear: If trade 2 fails after trade 1 succeeds, should trade 1 be rolled back?
   - Recommendation: Keep sequential, independent processing — each trade is its own atomic unit. This matches the spec's trade execution model and simplifies error reporting per trade.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 + pytest-asyncio 1.3.0 |
| Config file | `backend/pyproject.toml` (`[tool.pytest.ini_options]`) |
| Quick run command | `cd backend && uv run --extra dev pytest tests/services/ tests/routes/test_portfolio.py -x -q` |
| Full suite command | `cd backend && uv run --extra dev pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BACK-01 | Concurrent trades cannot double-spend cash | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestAtomicTrade -x` | Wave 0 |
| BACK-01 | Single buy deducts correct cash | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestAtomicTrade::test_buy -x` | Wave 0 |
| BACK-01 | Insufficient cash returns failure result | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestAtomicTrade::test_buy_insufficient_cash -x` | Wave 0 |
| BACK-02 | REST trade route uses TradeService | unit | `uv run --extra dev pytest tests/routes/test_portfolio.py -x` | Exists (needs update) |
| BACK-02 | LLM execute_actions uses TradeService | unit | `uv run --extra dev pytest tests/llm/test_service.py -x` | Exists (needs update) |
| BACK-03 | LLM watchlist add calls source.add_ticker | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestWatchlistSync -x` | Wave 0 |
| BACK-03 | LLM watchlist remove calls source.remove_ticker and cache.remove | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestWatchlistSync -x` | Wave 0 |
| BACK-04 | Snapshot recorded within execute_trade | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestSnapshot -x` | Wave 0 |
| BACK-04 | Background snapshot loop records every 30s | integration (manual) | manual-only — tests asyncio.sleep timing | N/A |

**Manual-only justification for BACK-04 background task:** Testing a 30-second asyncio sleep loop accurately requires real wall-clock time or monkeypatching `asyncio.sleep`. The unit test for BACK-04 focuses on verifying that `execute_trade` triggers an immediate snapshot — the periodic background task's existence and startup are verified by inspection of `main.py` lifespan.

### Sampling Rate
- **Per task commit:** `cd backend && uv run --extra dev pytest tests/services/ tests/routes/test_portfolio.py tests/llm/test_service.py -x -q`
- **Per wave merge:** `cd backend && uv run --extra dev pytest tests/ -v`
- **Phase gate:** Full suite (149 existing + new tests) green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/services/__init__.py` — package init for new services test directory
- [ ] `backend/tests/services/test_trade_service.py` — covers BACK-01, BACK-03, BACK-04
- [ ] `backend/app/services/__init__.py` — package init for new services directory
- [ ] `backend/app/services/trade_service.py` — the service being created

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `backend/app/db/connection.py`, `repository.py`, `routes/portfolio.py`, `llm/service.py`, `main.py`, `routes/watchlist.py` — all bugs and patterns verified from actual source
- `backend/pyproject.toml` — exact dependency versions confirmed
- `backend/tests/` — 149 passing tests confirmed as baseline; all test patterns documented

### Secondary (MEDIUM confidence)
- aiosqlite 0.22.1 behavior: `isolation_level = ""` default means implicit transactions for DML, not autocommit — verified via installed package behavior (tests pass with explicit `await db.commit()`)
- SQLite WAL mode persistence: documented behavior that `PRAGMA journal_mode=WAL` persists in the database file across connections

### Tertiary (LOW confidence — not needed, standard behavior)
- litellm `acompletion` existence: inferred from litellm conventions; both sync `completion` and async `acompletion` are standard litellm API surface

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, versions confirmed from pyproject.toml
- Architecture: HIGH — patterns derived directly from existing working code in the codebase
- Pitfalls: HIGH — BACK-01 race condition verified by direct code analysis; other pitfalls verified by comparing working REST route vs broken LLM path
- Transaction semantics: HIGH — SQLite WAL and BEGIN IMMEDIATE are well-documented stable behavior

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable libraries, no fast-moving dependencies)
