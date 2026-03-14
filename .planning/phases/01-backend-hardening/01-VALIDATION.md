---
phase: 1
slug: backend-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.0.2 + pytest-asyncio 1.3.0 |
| **Config file** | `backend/pyproject.toml` (`[tool.pytest.ini_options]`) |
| **Quick run command** | `cd backend && uv run --extra dev pytest tests/services/ tests/routes/test_portfolio.py tests/llm/test_service.py -x -q` |
| **Full suite command** | `cd backend && uv run --extra dev pytest tests/ -v` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && uv run --extra dev pytest tests/services/ tests/routes/test_portfolio.py tests/llm/test_service.py -x -q`
- **After every plan wave:** Run `cd backend && uv run --extra dev pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | BACK-01 | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestAtomicTrade -x` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | BACK-01 | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestAtomicTrade::test_buy -x` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | BACK-01 | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestAtomicTrade::test_buy_insufficient_cash -x` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | BACK-02 | unit | `uv run --extra dev pytest tests/routes/test_portfolio.py -x` | ✅ (needs update) | ⬜ pending |
| 01-01-05 | 01 | 1 | BACK-02 | unit | `uv run --extra dev pytest tests/llm/test_service.py -x` | ✅ (needs update) | ⬜ pending |
| 01-01-06 | 01 | 1 | BACK-03 | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestWatchlistSync -x` | ❌ W0 | ⬜ pending |
| 01-01-07 | 01 | 1 | BACK-03 | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestWatchlistSync -x` | ❌ W0 | ⬜ pending |
| 01-01-08 | 01 | 1 | BACK-04 | unit | `uv run --extra dev pytest tests/services/test_trade_service.py::TestSnapshot -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/services/__init__.py` — package init for new services test directory
- [ ] `backend/tests/services/test_trade_service.py` — stubs for BACK-01, BACK-03, BACK-04
- [ ] `backend/app/services/__init__.py` — package init for new services directory
- [ ] `backend/app/services/trade_service.py` — the service being created

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Background snapshot loop records every 30s | BACK-04 | Testing asyncio.sleep timing requires real wall-clock time or monkeypatching | Inspect `main.py` lifespan for `_snapshot_loop` task creation; verify interval is 30s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
