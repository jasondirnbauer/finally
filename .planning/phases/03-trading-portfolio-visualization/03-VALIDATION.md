---
phase: 3
slug: trading-portfolio-visualization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 3 — Validation Strategy

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
| 03-01-01 | 01 | 1 | CHART-01, DISP-03 | unit | `npx jest Sparkline` | `frontend/__tests__/Sparkline.test.tsx` | pending |
| 03-01-02 | 01 | 1 | CHART-01 | unit | `npx jest PriceChart` | `frontend/__tests__/PriceChart.test.tsx` | pending |
| 03-02-01 | 02 | 2 | TRADE-01, TRADE-02, TRADE-03 | unit | `npx jest TradeBar` | `frontend/__tests__/TradeBar.test.tsx` | pending |
| 03-02-02 | 02 | 2 | TRADE-01 | unit | `npx jest ChartPanel` | `frontend/__tests__/ChartPanel.test.tsx` | pending |
| 03-03-01 | 03 | 3 | CHART-02, CHART-04 | unit | `npx jest PositionsTable PortfolioHeatmap` | `frontend/__tests__/PositionsTable.test.tsx`, `frontend/__tests__/PortfolioHeatmap.test.tsx` | pending |
| 03-03-02 | 03 | 3 | CHART-03 | unit | `npx jest PnlChart` | `frontend/__tests__/PnlChart.test.tsx` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for chart components (PriceChart, Sparkline)
- [ ] Test stubs for trade components (TradeBar)
- [ ] Test stubs for wiring (ChartPanel)
- [ ] Test stubs for portfolio components (PortfolioHeatmap, PnlChart, PositionsTable)
- [ ] Mock for `lightweight-charts` (canvas-based, needs imperative mock)
- [ ] Mock for `recharts` components (Treemap, LineChart)

*Existing Jest + @testing-library infrastructure from Phase 2 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Price flash on chart data update | CHART-01 | Canvas rendering not testable in jsdom | Open browser, click ticker, verify chart renders with live updates |
| Heatmap color gradient accuracy | CHART-02 | SVG color interpolation visual | Open browser, make trades, verify green/red heatmap proportions |
| Trade bar instant feedback | TRADE-01 | Full API round-trip timing | Execute buy/sell, verify cash + positions update < 1 second |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
