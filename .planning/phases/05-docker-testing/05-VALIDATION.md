---
phase: 5
slug: docker-testing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend Framework** | pytest 8.3+ with pytest-asyncio 0.24+ (async auto mode) |
| **Frontend Framework** | Jest 30.3 with React Testing Library 16.3+ |
| **E2E Framework** | Playwright 1.58.2 (Chromium only) |
| **Backend Config** | `backend/pyproject.toml` [tool.pytest.ini_options] |
| **Frontend Config** | `frontend/jest.config.ts` |
| **E2E Config** | `test/playwright.config.ts` |
| **Backend Quick Run** | `cd backend && uv run --extra dev pytest -v` |
| **Frontend Quick Run** | `cd frontend && npm test` |
| **E2E Quick Run** | `cd test && npx playwright test` |
| **Estimated runtime** | ~60 seconds (backend + frontend), ~120s (E2E with container) |

---

## Sampling Rate

- **After every task commit:** Run relevant test suite (backend or frontend) based on changed files
- **After every plan wave:** Full backend + frontend test suites
- **Before `/gsd:verify-work`:** Docker build + all three test suites green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | INFRA-01 | integration | `docker build -t finally .` | N/A (build) | pending |
| 05-01-02 | 01 | 1 | INFRA-01 | integration | `docker run --rm -d -p 8000:8000 --name finally-test finally && sleep 5 && curl -sf http://localhost:8000/api/health` | N/A (runtime) | pending |
| 05-01-03 | 01 | 1 | INFRA-02 | integration | `bash scripts/start_mac.sh && curl http://localhost:8000/api/health` | Yes (scripts/) | pending |
| 05-02-01 | 02 | 1 | INFRA-04 | unit | `cd backend && uv run --extra dev pytest -v` | Yes (21+ files) | pending |
| 05-02-02 | 02 | 1 | INFRA-05 | unit | `cd frontend && npm test` | Yes (14 files) | pending |
| 05-03-01 | 03 | 2 | INFRA-03 | e2e | `cd test && npx playwright test` | Yes (5 specs) | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework installation needed.

- [ ] Verify `uv` available locally for backend tests
- [ ] Verify `node_modules` up to date in `frontend/` and `test/`
- [ ] Verify `npx playwright install --with-deps chromium` for E2E

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Windows PowerShell scripts | INFRA-02 | Platform-specific | Run `scripts/start_windows.ps1`, verify app at localhost:8000, run `scripts/stop_windows.ps1` |
| Docker volume persistence | INFRA-01 | Requires container restart | Start container, make a trade, stop, restart, verify trade persists |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
