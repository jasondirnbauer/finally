# Phase 2: Frontend Shell + Streaming - Research

**Researched:** 2026-03-14
**Domain:** Next.js 14 static export, Tailwind CSS dark theme, SSE/EventSource, React hooks, price flash animations
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Static export (`output: 'export'`) — Next.js project in `frontend/`
- Tailwind CSS for styling with custom dark theme
- React hooks + context for state (no external state management)
- Native `EventSource` API for SSE (no third-party wrapper)
- All API calls to same origin (`/api/*`) — no CORS config needed
- Desktop-first layout, Bloomberg/trading terminal aesthetic

### Claude's Discretion
All implementation details are at Claude's discretion:
- Layout grid structure (left panel, top panel, etc.)
- Typography choices (monospace for numbers recommended)
- Specific Tailwind class organization
- Hook API shape for SSE data
- How to accumulate price history for future sparkline use
- Exact header layout and branding

### Deferred Ideas (OUT OF SCOPE)
- Sparklines (DISP-03) — Phase 3; reserve space but don't implement
- Charts, heatmap, positions table — Phase 3
- Trade bar — Phase 3
- Chat panel — Phase 4
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISP-01 | Watchlist panel shows all watched tickers with current price, change amount, and change % | SSE hook feeds watchlist component; initial data from GET /api/watchlist |
| DISP-02 | Price flash animations — green highlight on uptick, red on downtick, fading over ~500ms via CSS transitions | CSS transition on background-color; React useEffect triggers class swap per price update |
| DISP-03 | Sparkline mini-charts beside each ticker (Phase 3 only — reserve space) | Accumulate price history array in SSE hook; sparkline rendering deferred |
| DISP-04 | Connection status indicator in header — green/yellow/red | EventSource readyState + onopen/onerror tracking in custom hook |
| DISP-05 | Header displays portfolio total value and cash balance, updating live | Poll GET /api/portfolio on SSE price events; or dedicate periodic fetch |
</phase_requirements>

---

## Summary

Phase 2 builds the entire Next.js frontend from scratch as a static export. The core deliverable is a dark trading terminal shell with live SSE price streaming. The SSE hook is the architectural spine: it connects to `/api/stream/prices`, tracks connection state, accumulates price history per ticker, and exposes all data to React components via context.

The tech stack is well-settled: Next.js 14 with `output: 'export'`, Tailwind CSS v3 with custom theme tokens, native `EventSource` for SSE, and Jest + React Testing Library for unit tests. No charting libraries are needed in this phase (sparklines deferred to Phase 3).

The key engineering challenge is the price flash animation — it must trigger on every price update even if the price stays the same value (e.g., repeated equal prices should still flash). The solution is to key on a monotonic update counter rather than price value alone.

**Primary recommendation:** Build a `usePriceStream` hook as the foundation, expose data via React context, keep components as pure display consumers. The SSE hook accumulates `priceHistory: Record<string, number[]>` for sparklines even though they render in Phase 3.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.x | Framework with static export | Specified in PLAN.md; static export = single-origin, no CORS |
| react | 18.x | UI runtime | Bundled with Next.js 14 |
| tailwindcss | 3.x | Utility CSS with custom theme | Specified in PLAN.md; easiest dark theme customization |
| typescript | 5.x | Type safety | Specified in PLAN.md; Next.js default |
| postcss | 8.x | Tailwind CSS processing | Required by Tailwind |
| autoprefixer | 10.x | CSS vendor prefixes | Required by Tailwind |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jest | 29.x | Unit test runner | INFRA-05 frontend unit tests |
| @testing-library/react | 14.x | Component testing | Unit tests for watchlist, flash animation |
| @testing-library/jest-dom | 6.x | DOM matchers | Assertion helpers |
| jest-environment-jsdom | 29.x | DOM simulation for Jest | Required for React Testing Library |
| ts-jest | 29.x | TypeScript compilation for Jest | Next.js + TS projects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native EventSource | socket.io-client | EventSource is sufficient for one-way SSE; socket.io adds 40KB for no benefit |
| Tailwind CSS | CSS Modules / styled-components | Tailwind is locked in by PLAN.md decision |
| React Context | Zustand / Jotai | Context is locked in by PLAN.md (no external state management) |

**Installation:**
```bash
npx create-next-app@14 frontend --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd frontend
npm install
# Dev dependencies for testing:
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest @types/jest
```

---

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── app/
│   ├── layout.tsx          # Root layout: dark bg, fonts, metadata
│   ├── globals.css         # Tailwind directives + CSS custom props
│   └── page.tsx            # Single page: assembles all panels
├── components/
│   ├── Header.tsx          # Portfolio value, cash, connection dot
│   ├── Watchlist.tsx       # Table of tickers with flash rows
│   └── WatchlistRow.tsx    # Individual row with flash animation
├── lib/
│   ├── types.ts            # PriceUpdate, WatchlistEntry, PortfolioSummary
│   ├── api.ts              # Typed fetch wrappers for /api/*
│   └── use-prices.ts       # usePriceStream hook (SSE + state)
├── context/
│   └── PriceContext.tsx    # React context exposing price stream data
├── __tests__/
│   ├── Header.test.tsx
│   ├── Watchlist.test.tsx
│   └── use-prices.test.ts
├── next.config.ts          # output: 'export', images: unoptimized
├── tailwind.config.ts      # Custom dark theme tokens
├── jest.config.ts
└── jest.setup.ts
```

### Pattern 1: SSE Custom Hook
**What:** `usePriceStream` encapsulates all EventSource logic — connection, reconnection, state tracking, data accumulation
**When to use:** Single source of truth for all real-time price data in the app

```typescript
// lib/use-prices.ts
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface PriceState {
  prices: Record<string, PriceUpdate>;       // latest price per ticker
  priceHistory: Record<string, number[]>;    // accumulated for sparklines (Phase 3)
  status: ConnectionStatus;
}

export function usePriceStream(): PriceState {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting');

  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource('/api/stream/prices');

      es.onopen = () => setStatus('connected');

      es.onmessage = (event) => {
        const update: PriceUpdate = JSON.parse(event.data);
        setPrices(prev => ({ ...prev, [update.ticker]: update }));
        setPriceHistory(prev => ({
          ...prev,
          [update.ticker]: [...(prev[update.ticker] ?? []), update.price].slice(-200),
        }));
      };

      es.onerror = () => {
        setStatus('reconnecting');
        es.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => { es?.close(); clearTimeout(reconnectTimer); };
  }, []);

  return { prices, priceHistory, status };
}
```

### Pattern 2: Price Flash Animation
**What:** CSS transition on `background-color` triggered by adding/removing a class. Key insight: React state must change on every update to re-trigger the animation, even for the same price value.
**When to use:** Any row where the price ticks

```typescript
// components/WatchlistRow.tsx
// Flash trigger: use updateKey (monotonic counter) not price value
const [flashClass, setFlashClass] = useState('');

useEffect(() => {
  if (!update) return;
  const cls = update.direction === 'up' ? 'flash-green' : 'flash-red';
  setFlashClass(cls);
  const timer = setTimeout(() => setFlashClass(''), 500);
  return () => clearTimeout(timer);
}, [update?.updateKey]); // updateKey from SSE, not price
```

```css
/* globals.css */
.flash-green {
  background-color: rgba(34, 197, 94, 0.25);
  transition: background-color 500ms ease-out;
}
.flash-red {
  background-color: rgba(239, 68, 68, 0.25);
  transition: background-color 500ms ease-out;
}
/* When class removed, transition back to transparent */
```

**Alternative approach using Tailwind + arbitrary values** — same effect but all in className strings. Less predictable for the fade-OUT direction. Custom CSS classes are more reliable for the "fade to transparent" direction.

### Pattern 3: Tailwind Dark Theme Config
**What:** Extend Tailwind with the exact brand colors from PLAN.md
**When to use:** All component styling

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0d1117',
          surface: '#1a1a2e',
          border: '#2d3748',
          text: '#e2e8f0',
          muted: '#718096',
          yellow: '#ecad0a',
          blue: '#209dd7',
          purple: '#753991',
          green: '#22c55e',
          red: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### Pattern 4: Next.js Static Export Config
**What:** Configure Next.js to produce a static build that FastAPI can serve
**When to use:** Required for single-container architecture

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },  // Static export requires this
  trailingSlash: true,            // Helps with static file serving
};

export default nextConfig;
```

### Pattern 5: Portfolio Data Refresh Strategy
**What:** Header needs portfolio total value and cash balance. Poll `GET /api/portfolio` initially and after each SSE price batch, but throttle to avoid hammering the backend.
**When to use:** Keeping header values fresh without per-tick API calls

```typescript
// Throttle portfolio refresh: call at most once per 2 seconds
// triggered by SSE price updates (which arrive ~500ms)
const portfolioRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const schedulePortfolioRefresh = useCallback(() => {
  if (portfolioRefreshRef.current) return; // already scheduled
  portfolioRefreshRef.current = setTimeout(async () => {
    portfolioRefreshRef.current = null;
    const data = await fetchPortfolio();
    setPortfolio(data);
  }, 1500);
}, []);
```

### Anti-Patterns to Avoid
- **Keying flash on price value:** If price repeats (simulator can send the same value twice), the `useEffect` won't re-run. Always key on a monotonic `updateKey` or sequence number from the SSE event.
- **Creating EventSource inside render:** Must be inside `useEffect` with cleanup. Creating on render causes multiple connections.
- **Polling `/api/portfolio` on every SSE message:** That's ~2 HTTP requests/sec per client. Throttle to 1-2 second debounce.
- **Not limiting priceHistory array length:** Unbounded growth will OOM long-running sessions. Cap at 200 entries per ticker.
- **Using `output: 'export'` with dynamic routes without `generateStaticParams`:** Static export requires all routes to be statically determinable. Single-page app avoids this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS transitions for flash | Manual JS animation loop | CSS `transition` property + class swap | GPU-accelerated, zero JS overhead, exactly what CSS transitions are for |
| SSE reconnection logic | Custom retry with exponential backoff | Simple `setTimeout(connect, 3000)` in `onerror` | EventSource's built-in retry is browser-dependent; explicit 3s retry is sufficient and predictable |
| Tailwind dark mode | Manual CSS variables + media queries | Tailwind `dark:` variant or just hardcode dark (always dark) | App is always dark — no toggle needed, hardcode all dark values |
| Number formatting | Custom decimal/comma logic | `Intl.NumberFormat` or simple helper in `lib/format.ts` | Browser-native, locale-aware |

**Key insight:** The flash animation is the most tempting to over-engineer. CSS transitions handle the fade perfectly — add class on update, remove class after 500ms timeout, the browser transitions between states automatically.

---

## Common Pitfalls

### Pitfall 1: Flash Animation Doesn't Re-trigger for Same Price
**What goes wrong:** SSE sends AAPL=$190.00 twice. `useEffect` with `[update.price]` dependency doesn't fire. No flash.
**Why it happens:** React skips effects when dependencies are reference-equal.
**How to avoid:** Add a `seq` or `updateKey` field to every SSE event (backend already sends `timestamp`). Use timestamp as the dependency, not price.
**Warning signs:** During testing, manually send the same price twice — if no flash, dependency is wrong.

### Pitfall 2: EventSource Memory Leak
**What goes wrong:** Component unmounts, EventSource connection stays open. Multiple connections accumulate on hot reload.
**Why it happens:** Missing `return () => es.close()` in useEffect cleanup.
**How to avoid:** Always close in cleanup: `return () => { es?.close(); clearTimeout(reconnectTimer); }`.
**Warning signs:** Network tab shows multiple open connections to `/api/stream/prices`.

### Pitfall 3: Static Export + API Routes
**What goes wrong:** Developer adds a Next.js API route (`/app/api/route.ts`). Build fails with "API routes are not supported with output: 'export'".
**Why it happens:** Static export cannot include server-side code.
**How to avoid:** All API calls go to the FastAPI backend at `/api/*`. Never create Next.js API routes in this project.
**Warning signs:** `next build` fails with export error mentioning route handlers.

### Pitfall 4: Tailwind Content Paths Miss Components
**What goes wrong:** Custom Tailwind classes don't appear in production build because `content` array doesn't include all file paths.
**Why it happens:** Tailwind purges unused classes based on content scanning.
**How to avoid:** Content array must include all files that use Tailwind classes: `['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './context/**/*.{ts,tsx}']`.
**Warning signs:** Styles work in dev, disappear in production build.

### Pitfall 5: Connection Status Misread
**What goes wrong:** Status shows "connected" but prices aren't updating — EventSource is open but SSE events stopped.
**Why it happens:** `onopen` fires once; subsequent backend restarts don't trigger `onerror` immediately in all browsers.
**How to avoid:** Add a "stale detection" — if no SSE message received in 10 seconds, treat as disconnected and reconnect.

### Pitfall 6: Initial Load — No Prices Before First SSE Event
**What goes wrong:** Watchlist renders empty until first SSE batch arrives (~500ms). Looks broken.
**Why it happens:** SSE data starts empty; `GET /api/watchlist` not fetched.
**How to avoid:** On mount, fetch `GET /api/watchlist` to populate initial prices. SSE updates overlay on top.

---

## Code Examples

### SSE Event Shape (from backend)
```typescript
// lib/types.ts
export interface PriceUpdate {
  ticker: string;
  price: number;
  previous_price: number;
  timestamp: string;    // ISO — use as updateKey for flash trigger
  change: number;       // absolute: price - previous_price
  direction: 'up' | 'down' | 'unchanged';
}

export interface WatchlistEntry {
  ticker: string;
  price: number | null;
  added_at: string;
}

export interface PortfolioSummary {
  cash_balance: number;
  total_value: number;
  positions: Position[];
}
```

### Connection Status Dot
```typescript
// components/Header.tsx
const statusColors: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  reconnecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-red-500',
};

<span className={`inline-block w-2 h-2 rounded-full ${statusColors[status]}`} />
```

### Number Formatting Helper
```typescript
// lib/format.ts
export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

export function formatChangePct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/` router | App Router (`app/`) | Next.js 13 (2022) | Layout system, server components by default |
| `next.config.js` | `next.config.ts` | Next.js 15 (2024) | TypeScript config natively supported |
| `tailwind.config.js` | `tailwind.config.ts` | Tailwind v3.3 (2023) | TypeScript config with `satisfies Config` |
| Manual EventSource retry | `onerror` + setTimeout | Always | Explicit reconnect is more predictable than browser default |

**Deprecated/outdated:**
- `pages/_app.tsx`: Legacy pages router pattern — use `app/layout.tsx` instead.
- `next/image` with static export: Requires `unoptimized: true` — not deprecated but requires explicit opt-in.

---

## Open Questions

1. **Does the backend SSE event include a sequence number or just `timestamp`?**
   - What we know: Backend sends `ticker, price, previous_price, timestamp, change, direction` per CONTEXT.md
   - What's unclear: Whether `timestamp` is unique per event (could collide if two events in same millisecond)
   - Recommendation: Use `timestamp` as the flash trigger key — simulator runs at ~500ms intervals so collisions are extremely unlikely. If needed, planner can add a `seq` field to the SSE event.

2. **Jest configuration with Next.js 14 App Router**
   - What we know: Next.js 14 uses App Router with server components; Jest doesn't support server components natively
   - What's unclear: Whether `next/jest` transformer handles App Router components cleanly
   - Recommendation: Use `jest-environment-jsdom` with `ts-jest`; test only client components (`'use client'`); skip server component testing.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + React Testing Library 14 |
| Config file | `frontend/jest.config.ts` (Wave 0 — does not exist yet) |
| Quick run command | `cd /c/Projects/finally/frontend && npm test -- --watchAll=false` |
| Full suite command | `cd /c/Projects/finally/frontend && npm test -- --watchAll=false --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01 | Watchlist renders tickers with price, change, change% | unit | `npm test -- --testPathPattern=Watchlist` | Wave 0 |
| DISP-02 | Flash class added on uptick, removed after 500ms | unit | `npm test -- --testPathPattern=WatchlistRow` | Wave 0 |
| DISP-04 | Status dot shows correct color per connection state | unit | `npm test -- --testPathPattern=Header` | Wave 0 |
| DISP-05 | Header renders portfolio value and cash balance | unit | `npm test -- --testPathPattern=Header` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd /c/Projects/finally/frontend && npm test -- --watchAll=false`
- **Per wave merge:** `cd /c/Projects/finally/frontend && npm test -- --watchAll=false --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/Header.test.tsx` — covers DISP-04, DISP-05
- [ ] `frontend/__tests__/Watchlist.test.tsx` — covers DISP-01
- [ ] `frontend/__tests__/WatchlistRow.test.tsx` — covers DISP-02
- [ ] `frontend/jest.config.ts` — Jest configuration for Next.js + TypeScript
- [ ] `frontend/jest.setup.ts` — `@testing-library/jest-dom` import
- [ ] Framework install: `npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest @types/jest`

---

## Sources

### Primary (HIGH confidence)
- Next.js 14 official docs (nextjs.org/docs) — static export config, App Router, `output: 'export'`
- Tailwind CSS v3 official docs (tailwindcss.com/docs) — custom theme, content paths, config TypeScript
- MDN EventSource API (developer.mozilla.org) — `onopen`, `onmessage`, `onerror`, `close()`
- React 18 hooks docs (react.dev) — `useEffect`, `useState`, `useCallback`, `useRef` patterns

### Secondary (MEDIUM confidence)
- Next.js Testing docs (nextjs.org/docs/app/building-your-application/testing/jest) — Jest setup for App Router
- React Testing Library docs (testing-library.com/docs/react-testing-library) — component testing patterns

### Tertiary (LOW confidence)
- Community pattern: "use timestamp not price value for flash trigger" — derived from React effect dependency behavior (well-understood React principle, HIGH confidence on mechanism, LOW on whether backend sends unique-enough timestamps)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Next.js 14, Tailwind v3, React 18 are well-documented and version-stable
- Architecture: HIGH — patterns derived from official React/Next.js docs and established SSE usage
- Pitfalls: HIGH — EventSource memory leak and flash animation trigger are well-known React patterns
- Test setup: MEDIUM — Next.js + Jest App Router integration has some rough edges; recommendation based on official Next.js testing docs

**Research date:** 2026-03-14
**Valid until:** 2026-09-14 (stable stack — Tailwind v3, Next.js 14, React 18 are not rapidly changing)
