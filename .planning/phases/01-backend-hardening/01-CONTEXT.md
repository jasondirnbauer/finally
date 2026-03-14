# Phase 1: Backend Hardening - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix critical backend bugs and extract shared services before the frontend is built against these APIs. Four deliverables: atomic trade transactions, shared TradeService, LLM watchlist sync to MarketDataSource, and portfolio snapshot background task.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation decisions for this phase are at Claude's discretion, guided by the PLAN.md spec and research findings. Key areas:

**Transaction model:**
- Restructure DB connections for atomic trade execution
- Current pattern (6 separate connections per trade) must be replaced with single-connection transactions
- Use BEGIN IMMEDIATE for write serialization

**TradeService design:**
- Extract duplicated trade logic from `routes/portfolio.py` and `llm/service.py` into a shared service
- Service should handle error differences between REST (HTTPException) and LLM (soft failure dicts) callers
- Consistent error response format for the frontend

**LLM watchlist sync:**
- `_execute_actions()` must call `source.add_ticker()` / `source.remove_ticker()` and `cache.remove()` matching what `routes/watchlist.py` already does
- Fire-and-forget pattern is acceptable (don't wait for first price)

**Blocking LLM call:**
- `litellm.completion` is synchronous and blocks the event loop — discovered during codebase scout
- Fix by wrapping in `asyncio.to_thread()` or switching to async `litellm.acompletion`
- Fix now (Phase 1) since it's in the same service being refactored

**Snapshot timing:**
- 30-second interval + immediately after each trade (per spec)
- No additional triggers needed (watchlist changes don't affect portfolio value directly)

**Connection management:**
- WAL pragma re-issued on every connection open — consolidate to init-time only
- Consider connection context manager pattern for cleaner resource handling

</decisions>

<specifics>
## Specific Ideas

No specific requirements — user delegated all backend decisions to Claude. Follow PLAN.md spec and research pitfall mitigations.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `db/connection.py`: `get_connection()` — needs refactoring but provides the base pattern
- `db/repository.py`: All CRUD functions exist and work individually — need transaction wrapping
- `market/cache.py`: PriceCache with `remove()` method already available
- `market/interface.py`: MarketDataSource ABC with `add_ticker()`/`remove_ticker()` methods

### Established Patterns
- Strategy pattern for market data sources (simulator vs Massive) — maintain this
- `app.state` for sharing price_cache and market_source across routes — use this for TradeService too
- Background tasks via `asyncio.create_task` in lifespan — follow this for snapshot task

### Integration Points
- `routes/portfolio.py` lines 69-143: Trade logic to extract
- `llm/service.py` lines 125-217: Duplicate trade logic to replace with TradeService calls
- `llm/service.py` lines 201-215: Watchlist changes missing MarketDataSource calls
- `main.py` lifespan: Where snapshot background task should be registered
- `llm/service.py` line 239: Synchronous litellm.completion to make async

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-backend-hardening*
*Context gathered: 2026-03-13*
