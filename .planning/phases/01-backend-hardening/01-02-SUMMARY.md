---
phase: 01-backend-hardening
plan: "02"
subsystem: backend
tags: [trade-service, refactor, async, llm, portfolio]
dependency_graph:
  requires: [01-01]
  provides: [BACK-02, BACK-03]
  affects: [backend/app/main.py, backend/app/routes/portfolio.py, backend/app/llm/service.py, backend/app/routes/chat.py]
tech_stack:
  added: []
  patterns: [app.state dependency injection, acompletion async LLM, TradeService delegation]
key_files:
  created: []
  modified:
    - backend/app/main.py
    - backend/app/routes/portfolio.py
    - backend/app/llm/service.py
    - backend/app/routes/chat.py
    - backend/tests/routes/conftest.py
    - backend/tests/llm/test_service.py
decisions:
  - TradeService injected via app.state (not passed through route parameters) — consistent with price_cache and market_source pattern
  - watchlist_changes "remove" returns status "not_found" instead of "error" when ticker absent — cleaner semantics
metrics:
  duration: ~12 minutes
  completed: "2026-03-14"
  tasks_completed: 2
  files_modified: 6
---

# Phase 1 Plan 02: Wire TradeService — Backend Hardening Summary

**One-liner:** Unified all trade and watchlist execution through TradeService with async LLM calls, eliminating duplicate inline DB logic from portfolio route and LLM service.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire TradeService into main.py, portfolio route, and test fixtures | 7e6452b | main.py, routes/portfolio.py, tests/routes/conftest.py |
| 2 | Fix LLM service — async call, TradeService delegation, watchlist sync | a6cb997 | llm/service.py, routes/chat.py, tests/llm/test_service.py |

## What Changed Per File

**backend/app/main.py**
- Import `TradeService` from `app.services`
- Register `app.state.trade_service = TradeService(price_cache, source)` in lifespan after market source is set up

**backend/app/routes/portfolio.py**
- Removed imports: `delete_position`, `get_position`, `insert_snapshot`, `insert_trade`, `update_cash_balance`, `upsert_position`
- Replaced ~75-line inline trade logic in `execute_trade` endpoint with `await trade_service.execute_trade(ticker, side, quantity)`
- Response shape preserved for frontend compatibility

**backend/app/llm/service.py**
- Replaced `from litellm import completion` with `from litellm import acompletion`
- Removed imports: `add_to_watchlist`, `delete_position`, `get_position`, `insert_snapshot`, `insert_trade`, `remove_from_watchlist`, `update_cash_balance`, `upsert_position`
- `_execute_actions` signature updated: added `trade_service` parameter
- All inline trade DB logic replaced with `await trade_service.execute_trade()`
- All watchlist changes replaced with `await trade_service.add_watchlist_ticker()` / `await trade_service.remove_watchlist_ticker()`
- Snapshot recording removed (TradeService handles it internally)
- `chat_with_llm` signature updated: added `trade_service` parameter; both call paths (mock + real) pass it through
- `completion(...)` replaced with `await acompletion(...)` — event loop no longer blocked during LLM calls

**backend/app/routes/chat.py**
- Extract `trade_service = request.app.state.trade_service`
- Pass to `chat_with_llm(body.message, price_cache, trade_service)`

**backend/tests/routes/conftest.py**
- Import `TradeService`
- Set `test_app.state.trade_service = TradeService(price_cache, mock_source)` in client fixture

**backend/tests/llm/test_service.py**
- Added `mock_source` fixture (async add_ticker/remove_ticker with tracking lists)
- Added `trade_service` async fixture constructing `TradeService(price_cache, mock_source)`
- All `TestExecuteActions` test methods updated to accept `trade_service` and pass to `_execute_actions`
- All `TestChatWithLlmMock` test methods updated to accept `trade_service` and pass to `chat_with_llm`

## Confirmation of Key Requirements

- **acompletion confirmed:** `grep -n "acompletion" backend/app/llm/service.py` shows line 6 (import) and line 178 (call with `await`)
- **TradeService wired in all callers:** portfolio route, LLM service, chat route all use `trade_service` from `app.state`
- **Watchlist sync via TradeService:** `add_watchlist_ticker` and `remove_watchlist_ticker` called in `_execute_actions` — source.add_ticker/remove_ticker + cache.remove() invoked atomically by TradeService

## Final Test Suite Result

```
162 passed in 9.47s
```

Zero failures. Full suite green.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `backend/app/main.py` exists and contains `trade_service = TradeService`
- `backend/app/routes/portfolio.py` exists and contains `trade_service.execute_trade`
- `backend/app/llm/service.py` exists and contains `acompletion`
- Commits 7e6452b and a6cb997 both verified in git log
