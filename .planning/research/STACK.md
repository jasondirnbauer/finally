# Technology Stack

**Project:** FinAlly - AI Trading Workstation
**Researched:** 2026-03-13

## Stack Status

The backend is **fully built and tested** (market data, database, portfolio, LLM chat, all API routes). The frontend is **not yet built** (previous scaffolding was deleted). This document covers the entire stack but focuses recommendations on the frontend, which is the primary remaining build target.

---

## Backend Stack (Built - Locked Versions)

These versions are confirmed from `uv.lock` and `pyproject.toml`. No changes recommended.

### Core Runtime

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Python | 3.12 | Runtime | Locked (Dockerfile) |
| FastAPI | 0.128.7 | HTTP framework, SSE streaming, static file serving | Locked |
| uvicorn | 0.40.0 | ASGI server | Locked |
| Pydantic | 2.12.5 | Request/response validation, LLM structured output models | Locked |
| aiosqlite | 0.22.1 | Async SQLite access with WAL mode | Locked |
| LiteLLM | 1.81.10 | LLM gateway (OpenRouter/Cerebras) | Locked |
| NumPy | 2.4.2 | GBM simulation, Cholesky decomposition | Locked |
| massive | 1.0.0+ | Polygon.io market data client | Locked |
| uv | latest | Python project/dependency management | Dockerfile pulls latest |

### Dev Dependencies

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| pytest | 9.0.2 | Test runner | Locked |
| pytest-asyncio | 1.3.0 | Async test support | Locked |
| pytest-cov | 7.0.0 | Coverage reporting | Locked |
| ruff | 0.15.0 | Linting and formatting | Locked |
| httpx | 0.28.1 | Async HTTP client for API route testing | Locked |

**Confidence: HIGH** - Versions verified from lockfile artifacts in the repository.

---

## Frontend Stack (To Build)

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | ^15.0 | React framework with static export | Plan mandates static export via `output: 'export'`; Next.js 15 is the current stable major. Dockerfile already expects `npm run build` producing `/out`. Use the App Router (default since Next.js 13). |
| React | ^19.0 | UI library | Next.js 15 ships with React 19 by default. React 19 provides improved performance, `use()` hook, and better server-side support. |
| TypeScript | ^5.6 | Type safety | Plan mandates TypeScript. v5.6+ aligns with Next.js 15 expectations. |

**Confidence: MEDIUM** - Next.js 15 was released Oct 2024, stable in my training data. React 19 was released Dec 2024. Exact latest patch versions unverified (WebSearch/npm unavailable).

**Important Next.js static export constraint:** With `output: 'export'`, the app cannot use Server Components that do data fetching, Route Handlers, middleware, or ISR. All data fetching must happen client-side via `fetch()` or `EventSource`. This is fine for this project since all data comes from the FastAPI backend via REST and SSE.

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | ^3.4 | Utility-first CSS framework | Plan specifies Tailwind CSS with custom dark theme. Use v3.4 (stable, well-documented) rather than v4.0 which was recently released and may have ecosystem compatibility gaps with Next.js plugins. Tailwind v3 uses `tailwind.config.js` for theming; v4 uses CSS-native configuration which is a paradigm shift. |

**Why Tailwind v3.4 over v4:** Tailwind v4 (released Jan 2025) introduced a fundamentally different configuration model using CSS `@theme` directives instead of `tailwind.config.js`. While v4 is production-ready, the ecosystem of examples, tutorials, and component libraries overwhelmingly targets v3.x. For a project built by coding agents where pattern-matching against training data matters, v3.4 is the safer choice. The dark theme configuration is straightforward in v3 with `darkMode: 'class'` and custom color tokens.

**Confidence: MEDIUM** - Tailwind v3.4 stable and well-known. v4.0 release confirmed in training data but exact compatibility with Next.js 15 static export unverified.

### Charting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| lightweight-charts | ^4.2 | Main price chart, sparklines | TradingView's open-source canvas-based charting library. Purpose-built for financial data. Renders candlestick, line, area, bar, and histogram charts with professional styling. Canvas-based = performant with streaming data. Far lighter than full TradingView widget. Plan specifically mentions it as an option. |
| Recharts | ^2.12 | P&L line chart, supplementary charts | React-friendly declarative charting built on D3. Better for non-financial charts (line charts for portfolio value over time). Supports responsive containers, tooltips, animations. Widely used with React, large ecosystem of examples. |

**Why both libraries:** Lightweight Charts excels at financial price charts with real-time streaming — it handles time-series candlestick/line data with minimal configuration and has built-in price scaling, crosshairs, and time axes that look like a trading terminal. Recharts is better for the P&L portfolio value chart where you want a simple responsive line chart with tooltips and React-idiomatic composition. Using both gives the best tool for each job.

**Why NOT just Recharts for everything:** Recharts is SVG-based, which becomes sluggish with frequent updates (price streaming at 500ms). Lightweight Charts uses canvas rendering and is specifically designed for real-time financial data updates.

**Why NOT Chart.js:** Requires a React wrapper (`react-chartjs-2`), adds an extra dependency layer, and doesn't have the financial chart features (time-based axes, crosshairs, price scales) that Lightweight Charts provides out of the box.

**Why NOT Apache ECharts:** Overkill for this use case. Massive library size, complex API, not React-idiomatic. The two-library approach (lightweight-charts + recharts) gives better results with less bundle size.

**Confidence: MEDIUM** - lightweight-charts v4.x and Recharts v2.x are well-established in training data. Exact latest patch versions unverified.

### Portfolio Heatmap (Treemap)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| recharts (Treemap) | ^2.12 | Portfolio heatmap/treemap visualization | Recharts includes a `<Treemap>` component that renders rectangles sized by value. Already included for P&L charting — no additional dependency. Style with custom content renderer to color by P&L (green/red gradient). |

**Alternative considered: `react-d3-treemap`** - Dedicated treemap component, but adds another dependency and has smaller community. Since Recharts already provides `<Treemap>`, use it.

**Alternative considered: `nivo` (`@nivo/treemap`)** - Excellent visualization library with beautiful defaults, but adds a heavyweight D3-based dependency chain. Recharts is already in the project.

**Confidence: MEDIUM** - Recharts Treemap component is stable and well-documented in training data.

### State Management & Data Fetching

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React hooks (built-in) | n/a | Local component state, context | No external state library needed. The app has a simple data model: watchlist, portfolio, prices, chat messages. React `useState`, `useReducer`, and `useContext` are sufficient. |
| Native `fetch` API | n/a | REST API calls to `/api/*` | Same-origin requests to FastAPI backend. No need for axios or SWR — the API surface is small (5 REST endpoints). |
| Native `EventSource` API | n/a | SSE price streaming from `/api/stream/prices` | Plan mandates EventSource. Built-in browser API with automatic reconnection. Wrap in a custom React hook (`usePrices`) that manages connection lifecycle and distributes price updates to subscribers. |

**Why NOT Zustand/Jotai/Redux:** Over-engineering for a single-page single-user app with ~5 API endpoints. React Context + hooks is the right scale. A `PriceContext` can broadcast SSE updates to all consuming components. A `PortfolioContext` can hold positions and cash. If you find yourself passing 5+ props, lift to context — but don't pre-optimize with a state library.

**Why NOT SWR/TanStack Query:** These shine for apps with many cacheable API calls, pagination, and revalidation patterns. This app has a handful of endpoints and real-time streaming. A simple `useEffect + fetch` pattern is clearer and more maintainable for this scope.

**Confidence: HIGH** - These are standard React patterns, not library-dependent.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.1 | Conditional CSS class merging | Combining Tailwind classes conditionally (e.g., price flash green/red) |
| tailwind-merge | ^2.5 | Tailwind class conflict resolution | Merge component prop classes with base classes without conflicts |

**Why NOT `classnames`:** `clsx` is the modern successor — smaller, faster, same API.

**Confidence: HIGH** - Small, stable utilities with no version sensitivity.

### Frontend Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Jest | ^29.7 | Test runner | Standard React/Next.js testing. Works with static export apps. |
| React Testing Library | ^16.0 | Component testing | Tests components as users interact with them. De facto standard for React component tests. |
| @testing-library/jest-dom | ^6.5 | DOM matchers | Custom Jest matchers like `toBeInTheDocument()`, `toHaveClass()`. |
| ts-jest | ^29.2 | TypeScript support for Jest | Transpiles TypeScript test files. |

**Why NOT Vitest:** Vitest is excellent and faster, but Next.js projects conventionally use Jest. The Next.js docs and `create-next-app` scaffold ship with Jest configuration. For agent-built code that needs to match patterns in training data, Jest has more Next.js-specific examples.

**Confidence: MEDIUM** - Jest + RTL is the standard React testing stack. Exact latest versions unverified.

### E2E Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Playwright | ^1.48 | End-to-end browser testing | Plan specifies Playwright. Tests run against the Docker container with `LLM_MOCK=true`. `docker-compose.test.yml` already exists. |

**Confidence: MEDIUM** - Playwright is the standard. Exact latest version unverified.

---

## Infrastructure (Built - Confirmed)

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| Docker | Multi-stage | Container: Node 20 slim (build) + Python 3.12 slim (runtime) | Dockerfile exists and is correct |
| Node.js | 20 LTS | Frontend build stage only (not runtime) | Specified in Dockerfile |
| SQLite | 3.x (system) | Database, volume-mounted at `/app/db` | Via aiosqlite in Python runtime |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 15 | Vite + React | Plan mandates Next.js. Static export works well. Vite would work but doesn't match project spec. |
| Charting (financial) | Lightweight Charts | TradingView widget | TradingView widget requires account/API key and has usage restrictions. Lightweight Charts is the open-source library from the same team. |
| Charting (general) | Recharts | Chart.js + react-chartjs-2 | Recharts is more React-idiomatic (JSX components vs. imperative config). Also provides Treemap for the heatmap. |
| Styling | Tailwind CSS v3.4 | Tailwind v4 | v4 has breaking config changes, less ecosystem support. v3.4 is battle-tested. |
| Styling | Tailwind CSS | CSS Modules | Tailwind gives faster development with utility classes, built-in responsive/dark mode, and the plan specifies it. |
| State management | React hooks + context | Zustand | Overkill for this app's scale. Adds dependency without clear benefit. |
| Data fetching | Native fetch | SWR/TanStack Query | App has 5 endpoints and SSE streaming. A fetch wrapper adds complexity without benefit at this scale. |
| SSE client | Native EventSource | eventsource polyfill | EventSource has universal modern browser support. No polyfill needed for desktop-first app. |
| Backend framework | FastAPI | - | Already built and locked. Not a decision point. |
| Database | SQLite | - | Already built and locked. Schema exists with seed data. |
| LLM client | LiteLLM | - | Already built and locked. Structured output with Pydantic models working. |

---

## Installation

### Frontend (to be created)

```bash
# Initialize Next.js project
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Core dependencies
npm install lightweight-charts recharts clsx tailwind-merge

# Dev dependencies (if not already from create-next-app)
npm install -D @testing-library/react @testing-library/jest-dom jest ts-jest @types/jest jest-environment-jsdom
```

### Backend (already installed)

```bash
cd backend
uv sync --extra dev  # All deps already locked
```

### E2E Tests

```bash
cd test
npm init -y
npm install -D @playwright/test
npx playwright install chromium
```

---

## Key Configuration

### next.config.ts (static export)

```typescript
const nextConfig = {
  output: 'export',
  // No image optimization with static export
  images: { unoptimized: true },
};
export default nextConfig;
```

### Tailwind custom theme (tailwind.config.js)

```javascript
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0d1117',
          surface: '#1a1a2e',
          border: '#30363d',
        },
        accent: {
          yellow: '#ecad0a',
          blue: '#209dd7',
          purple: '#753991',
        },
        pnl: {
          profit: '#22c55e',
          loss: '#ef4444',
        },
      },
    },
  },
};
```

---

## Version Pinning Strategy

**Backend:** Locked via `uv.lock`. Reproducible. No changes needed.

**Frontend:** Use caret ranges (`^`) in `package.json` for flexibility, but commit `package-lock.json` for reproducibility. The Dockerfile uses `npm ci` which respects the lockfile.

**Docker base images:** Pin to major versions (`node:20-slim`, `python:3.12-slim`). This is already done correctly in the Dockerfile.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Backend stack | HIGH | Versions verified from lockfile. Code is built and tested (73 tests, 84% coverage). |
| Next.js + React | MEDIUM | Major versions (Next 15, React 19) confirmed in training data. Patch versions unverified — use `create-next-app@latest` to get current stable. |
| Lightweight Charts | MEDIUM | v4.x is well-established for financial charts. Exact latest patch unverified. |
| Recharts | MEDIUM | v2.x is stable and widely used. Treemap component confirmed available. |
| Tailwind CSS v3 vs v4 | MEDIUM | v4.0 release confirmed. Recommendation to use v3.4 is based on ecosystem maturity rationale. `create-next-app` with `--tailwind` may install v4 by default — if so, using v4 is acceptable; the core utility classes are compatible. |
| Testing stack | MEDIUM | Jest + RTL is the standard. Version numbers are approximate. |
| Infrastructure | HIGH | Dockerfile, docker-compose verified from repository files. |

---

## Sources

- `backend/pyproject.toml` and `backend/uv.lock` — exact backend dependency versions
- `Dockerfile` — build stages, Node 20, Python 3.12
- `docker-compose.yml` and `test/docker-compose.test.yml` — container configuration
- `backend/app/main.py` — FastAPI app structure, static file serving
- `backend/app/market/` — 8 modules, complete market data subsystem
- `backend/app/db/` — schema, connection, repository (fully implemented)
- `backend/app/llm/` — LiteLLM integration with structured output (fully implemented)
- `backend/app/routes/` — all API routes implemented (portfolio, watchlist, chat)
- `planning/PLAN.md` — architectural decisions, technology mandates
- `planning/MARKET_DATA_SUMMARY.md` — market data subsystem documentation
- Training data (May 2025 cutoff) — frontend library versions and patterns (MEDIUM confidence)
