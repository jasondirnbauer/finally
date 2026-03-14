# Phase 2: Frontend Shell + Streaming - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the Next.js project with static export, establish the dark terminal aesthetic with Tailwind CSS, build the SSE streaming hook, and deliver the watchlist panel with live prices + flash animations, connection status indicator, and header with portfolio value and cash balance. This phase proves SSE integration end-to-end and establishes the visual foundation all other phases build on.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation decisions for this phase are at Claude's discretion, guided by PLAN.md spec and Bloomberg-terminal conventions. Key areas:

**Layout structure:**
- Desktop-first grid layout inspired by Bloomberg/trading terminals
- Fixed header with portfolio value, cash balance, connection status
- Watchlist panel as a prominent left or top panel
- Reserve space for chart area, positions, heatmap, and chat panel (placeholders for Phase 3/4)
- Layout should feel data-dense — every pixel earns its place

**Dark theme:**
- Backgrounds: `#0d1117` or `#1a1a2e`, muted gray borders, no pure black
- Accent Yellow: `#ecad0a` for highlights
- Blue Primary: `#209dd7` for data emphasis
- Purple Secondary: `#753991` for submit buttons
- Tailwind CSS custom theme configuration
- Professional, terminal-inspired typography (monospace for numbers)

**Watchlist panel:**
- Each row: ticker symbol, current price, change amount, change %
- Price flash: green highlight on uptick, red on downtick, ~500ms CSS fade transition
- Clickable rows (selection state for future chart integration in Phase 3)
- Sparklines are Phase 3 (DISP-03) — reserve space but don't implement yet

**SSE integration:**
- Custom React hook using native EventSource API
- Auto-reconnection handling
- Connection status tracking (connected/reconnecting/disconnected)
- Price data accumulation for future sparkline use

**Header:**
- Portfolio total value (from /api/portfolio, updated on price changes)
- Cash balance
- Connection status dot (green/yellow/red)
- App name/branding

**Next.js setup:**
- Static export (`output: 'export'`)
- Tailwind CSS for styling
- React hooks + context for state (no external state management)
- All API calls to same origin (`/api/*`)

</decisions>

<specifics>
## Specific Ideas

No specific user requirements beyond PLAN.md. Follow Bloomberg/TradingView conventions for data-dense dark terminal UIs. The "wow factor" matters — this is a course capstone demo.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Backend SSE endpoint at `GET /api/stream/prices` — sends price updates with ticker, price, previous_price, timestamp, change, direction
- Backend `GET /api/portfolio` — returns positions, cash_balance, total_value
- Backend `GET /api/watchlist` — returns watchlist tickers with latest prices

### Established Patterns
- FastAPI serves static files from a `static/` directory — Next.js build output goes here
- SSE events contain JSON with all fields needed for display and flash logic
- All API responses use consistent JSON shapes

### Integration Points
- `frontend/` directory is the Next.js project root
- Build output: `frontend/out/` → copied to `static/` in Dockerfile
- No frontend code exists yet — clean slate

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-frontend-shell-streaming*
*Context gathered: 2026-03-13*
