---
phase: 2
slug: frontend-shell-streaming
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + React Testing Library 14 |
| **Config file** | `frontend/jest.config.ts` (Wave 0 — does not exist yet) |
| **Quick run command** | `cd frontend && npm test -- --watchAll=false` |
| **Full suite command** | `cd frontend && npm test -- --watchAll=false --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm test -- --watchAll=false`
- **After every plan wave:** Run `cd frontend && npm test -- --watchAll=false --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DISP-01 | unit | `npm test -- --testPathPattern=Watchlist` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DISP-02 | unit | `npm test -- --testPathPattern=WatchlistRow` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DISP-04 | unit | `npm test -- --testPathPattern=Header` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | DISP-05 | unit | `npm test -- --testPathPattern=Header` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/__tests__/Header.test.tsx` — covers DISP-04, DISP-05
- [ ] `frontend/__tests__/Watchlist.test.tsx` — covers DISP-01
- [ ] `frontend/__tests__/WatchlistRow.test.tsx` — covers DISP-02
- [ ] `frontend/jest.config.ts` — Jest configuration for Next.js + TypeScript
- [ ] `frontend/jest.setup.ts` — `@testing-library/jest-dom` import
- [ ] Framework install: `npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest @types/jest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE reconnection behavior | DISP-04 | EventSource reconnection is browser-native; mocking requires full SSE mock server | Open browser, disconnect network, verify yellow then red dot, reconnect and verify green |
| Flash animation visual timing | DISP-02 | CSS transition timing (500ms fade) cannot be verified in JSDOM | Open browser, observe green/red flash on price change, verify fade timing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
