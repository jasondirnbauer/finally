---
phase: 4
slug: ai-chat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x with @testing-library/react |
| **Config file** | `frontend/jest.config.ts` |
| **Quick run command** | `cd frontend && npx jest --watchAll=false` |
| **Full suite command** | `cd frontend && npx jest --watchAll=false --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx jest --watchAll=false`
- **After every plan wave:** Run `cd frontend && npx jest --watchAll=false --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 04-01-01 | 01 | 1 | CHAT-01 | unit | `npx jest ChatMessage ChatInput` | `frontend/__tests__/ChatMessage.test.tsx`, `frontend/__tests__/ChatInput.test.tsx` | pending |
| 04-01-02 | 01 | 1 | CHAT-04 | unit | `npx jest ChatActionCard` | `frontend/__tests__/ChatActionCard.test.tsx` | pending |
| 04-02-01 | 02 | 2 | CHAT-01, CHAT-02, CHAT-03, CHAT-05, CHAT-06 | unit | `npx jest ChatPanel` | `frontend/__tests__/ChatPanel.test.tsx` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for ChatMessage, ChatInput, ChatActionCard components
- [ ] Test stubs for ChatPanel integration
- [ ] Mock for fetch/API calls in chat tests

*Existing Jest + @testing-library infrastructure from Phase 2 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LLM response quality | CHAT-05 | AI response content varies | Send "analyze my portfolio", verify response covers composition, risk, P&L |
| Trade auto-execution end-to-end | CHAT-03 | Requires running backend + LLM | Send "buy 5 AAPL", verify cash decreases and position appears |
| Watchlist sync after AI add | CHAT-06 | Requires SSE + backend integration | Ask AI to add ticker, verify it streams in watchlist |
| Loading indicator visibility | CHAT-02 | Visual/timing dependent | Send message, verify spinner appears during processing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
