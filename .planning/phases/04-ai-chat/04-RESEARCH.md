# Phase 4: AI Chat - Research

**Researched:** 2026-03-14
**Domain:** LLM-integrated chat UI, backend structured output, action auto-execution
**Confidence:** HIGH

## Summary

Phase 4 integrates the already-built backend LLM service with a new frontend chat panel. The backend is **fully complete**: the `POST /api/chat` endpoint accepts a message, calls OpenRouter/Cerebras (or mock), auto-executes trades and watchlist changes, stores conversation history, and returns structured JSON. The `GET /api/chat/history` endpoint returns past messages with actions. The Pydantic models (`LlmResponse`, `TradeAction`, `WatchlistChange`), the mock service, and comprehensive backend tests all exist.

The frontend work is the primary effort: building a collapsible/dockable chat panel with message input, scrolling conversation history, loading indicator, and styled inline action confirmation cards. The frontend TypeScript types (`ChatMessage`, `ChatActions`) already exist in `lib/types.ts`. The API client (`lib/api.ts`) needs new functions for chat endpoints but follows a well-established `apiFetch` pattern.

**Primary recommendation:** Build the chat panel as a new `ChatPanel` component, integrate it into the main page layout as a collapsible right-side panel, and connect it to the existing backend endpoints. No backend changes are needed -- the API contract is complete and tested.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | Chat panel (docked/collapsible sidebar) with message input and scrolling conversation history | Frontend component; layout integration in page.tsx; existing panel patterns (Watchlist) as reference |
| CHAT-02 | Loading indicator while waiting for LLM response | Simple boolean state in ChatPanel; spinner or pulsing dots while POST /api/chat is in-flight |
| CHAT-03 | User can ask AI to execute trades via natural language, trades auto-execute | Backend already handles this completely; frontend just sends message and displays results from response |
| CHAT-04 | Inline action confirmations -- trade executions and watchlist changes shown as styled cards in chat | Frontend rendering of `trades` and `watchlist_changes` arrays from the API response; styled card components |
| CHAT-05 | AI can analyze portfolio composition, risk concentration, and P&L when asked | Backend `_build_context()` already enriches prompts with full portfolio state; mock mode also supports this |
| CHAT-06 | AI can add/remove tickers from watchlist via natural language | Backend `_execute_actions()` already handles this; frontend needs to call `refreshWatchlist()` after chat responses with watchlist changes |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18 | UI framework | Already in project |
| Next.js | 14.2.35 | Static export framework | Already in project |
| Tailwind CSS | ^3.4.1 | Styling | Already in project; all existing components use it |
| TypeScript | ^5 | Type safety | Already in project |

### Backend (Already Installed, No Changes Needed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| FastAPI | >=0.115.0 | API framework | Chat route exists at `backend/app/routes/chat.py` |
| LiteLLM | >=1.81.10 | LLM orchestration | Service exists at `backend/app/llm/service.py` |
| Pydantic | (via FastAPI) | Structured outputs | Models exist at `backend/app/llm/models.py` |

### Supporting (No New Dependencies)
No new npm packages are needed. The chat UI uses standard React state management, fetch API, and Tailwind CSS -- all already available in the project.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom chat state | zustand/jotai | Overkill -- single component with local state is sufficient for single-user app |
| Markdown rendering | react-markdown | Not needed -- AI responses are plain text with structured action data handled separately |
| Token streaming | SSE for chat | PLAN.md explicitly states "no token-by-token streaming" -- Cerebras is fast enough; loading indicator suffices |

## Architecture Patterns

### Recommended Project Structure
```
frontend/
  components/
    ChatPanel.tsx          # Main chat panel (collapsible sidebar)
    ChatMessage.tsx        # Individual message bubble (user or assistant)
    ChatActionCard.tsx     # Inline action confirmation card (trade/watchlist)
    ChatInput.tsx          # Message input with send button
  lib/
    api.ts                 # Add sendChatMessage() and fetchChatHistory()
    types.ts               # ChatMessage and ChatActions types already exist
```

### Pattern 1: Chat Panel as Collapsible Sidebar
**What:** The chat panel is a right-side dockable panel that can be collapsed/expanded. When expanded, it takes a fixed width from the main layout grid.
**When to use:** This is the only chat layout pattern for this phase.
**Implementation approach:**
- Add a state variable `chatOpen` to the main page (or context) that controls panel visibility
- Modify the page grid: when chat is open, add a fixed-width right column (e.g., 380px)
- The chat panel renders inside this column with full height
- A toggle button in the header toggles the panel
- Layout transition: `grid-cols-[320px_1fr]` becomes `grid-cols-[320px_1fr_380px]`

```typescript
// page.tsx layout with chat panel
<div className={`flex-1 grid ${chatOpen ? 'grid-cols-[320px_1fr_380px]' : 'grid-cols-[320px_1fr]'} gap-2 p-2 overflow-hidden`}>
  {/* Watchlist */}
  <div className="flex flex-col overflow-hidden"><Watchlist /></div>
  {/* Main content */}
  <div className="grid grid-rows-[3fr_2fr] gap-2 overflow-hidden">
    <ChartPanel />
    <PortfolioPanel />
  </div>
  {/* Chat panel -- conditional */}
  {chatOpen && <ChatPanel />}
</div>
```

### Pattern 2: Chat State Management
**What:** Local state within ChatPanel, not global context. Chat messages are an array in component state, updated on send/receive.
**When to use:** Always -- chat state does not need to be shared with other components.
**Key details:**
- Load history from `GET /api/chat/history` on mount
- On send: add user message to local state immediately (optimistic), POST to `/api/chat`, add assistant response to state on success
- Loading state: boolean flag set while awaiting response
- Auto-scroll: use `useRef` on the messages container, scroll to bottom after new messages
- After receiving a response with trades or watchlist changes, call `refreshPortfolio()` and `refreshWatchlist()` from PriceContext to update the rest of the UI

### Pattern 3: Action Card Rendering
**What:** When an assistant message includes `trades` or `watchlist_changes`, render styled cards inline below the message text.
**When to use:** For every assistant message that has non-empty action arrays.
**Design:**
- Trade cards: show "Bought/Sold X shares of TICKER at $PRICE" with green/red accent
- Watchlist cards: show "Added/Removed TICKER from watchlist" with blue accent
- Error cards: show "Failed: reason" with red border for failed actions
- Cards use the existing terminal color scheme (terminal-surface, terminal-border, terminal-green, terminal-red, terminal-blue)

### Pattern 4: API Response Contract
**What:** The backend chat endpoint returns this exact shape (verified from source code).
**POST /api/chat** request body:
```json
{"message": "buy 5 shares of AAPL"}
```
**Response:**
```json
{
  "message": "Executing purchase of 5 shares of AAPL.",
  "trades": [
    {"ticker": "AAPL", "side": "buy", "quantity": 5, "price": 190.50, "status": "executed"}
  ],
  "watchlist_changes": []
}
```
Failed trade response:
```json
{
  "trades": [
    {"ticker": "AAPL", "side": "buy", "error": "Insufficient cash. Need $952.50, have $100.00"}
  ]
}
```

**GET /api/chat/history** response:
```json
{
  "messages": [
    {"id": "uuid", "role": "user", "content": "hello", "actions": null, "created_at": "2026-..."},
    {"id": "uuid", "role": "assistant", "content": "I'm FinAlly...", "actions": "{\"trades\":[],\"watchlist_changes\":[]}", "created_at": "2026-..."}
  ]
}
```
**Important:** The `actions` field in history is a JSON *string* (not parsed object) or null. The frontend must `JSON.parse()` it when loading history.

### Anti-Patterns to Avoid
- **Storing chat state in PriceContext:** Chat is self-contained. Adding it to the global context would bloat PriceContext and cause unnecessary re-renders across the entire app.
- **Building custom WebSocket or SSE for chat:** PLAN.md explicitly says "no token-by-token streaming." Use standard fetch POST. Cerebras inference is fast enough.
- **Calling backend endpoints directly for trades from chat:** The backend `/api/chat` endpoint already handles trade execution internally. The frontend should NOT call `/api/portfolio/trade` separately for AI-initiated trades -- just call `/api/chat` and let the backend orchestrate.
- **Forgetting to refresh portfolio/watchlist after chat actions:** When the AI executes trades or changes the watchlist, the frontend sidebar and portfolio views won't update unless `refreshPortfolio()` and `refreshWatchlist()` are called explicitly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM integration | Custom OpenAI client | Existing `backend/app/llm/service.py` | Already built, tested, uses LiteLLM + structured outputs |
| Chat history persistence | Custom storage | Existing `chat_messages` table + repository functions | Already built with `insert_chat_message` and `get_chat_history` |
| Trade execution from chat | Custom trade logic | Existing `_execute_actions()` in LLM service | Uses TradeService with atomic transactions, already tested |
| Watchlist sync from chat | Custom sync | Existing `TradeService.add_watchlist_ticker/remove_watchlist_ticker` | Already syncs to MarketDataSource, already tested |
| Mock responses for testing | Custom mocks | Existing `backend/app/llm/mock.py` | Pattern matching for buy/sell/watch/portfolio, deterministic |

**Key insight:** The entire backend for Phase 4 is already complete. Phase 4 is 90% a frontend task. The only backend concern is ensuring the existing endpoints work correctly end-to-end (they do -- tests pass).

## Common Pitfalls

### Pitfall 1: Chat Actions Field is a JSON String in History
**What goes wrong:** Loading chat history and treating `actions` as a parsed object when it's actually a JSON string stored in SQLite.
**Why it happens:** The `insert_chat_message` function stores `actions` as `json.dumps(...)` (string). The `get_chat_history` function returns the raw string from the DB.
**How to avoid:** When loading history, parse `actions` with `JSON.parse()`. When receiving a live response from `POST /api/chat`, the `trades` and `watchlist_changes` are already parsed objects (not strings).
**Warning signs:** Action cards not rendering for historical messages.

### Pitfall 2: Not Refreshing Portfolio After Chat Trades
**What goes wrong:** User asks AI to buy shares, trade executes on the backend, but the portfolio display, positions table, and cash balance don't update.
**Why it happens:** The chat panel operates independently from PriceContext. The portfolio data is fetched separately.
**How to avoid:** After receiving a chat response with non-empty `trades` or `watchlist_changes`, call `refreshPortfolio()` and `refreshWatchlist()` from PriceContext.
**Warning signs:** Stale portfolio data until the next SSE-triggered refresh cycle (up to 1.5s delay).

### Pitfall 3: Chat Panel Scroll Not Following New Messages
**What goes wrong:** User has to manually scroll down to see the AI's response.
**Why it happens:** Adding messages to state doesn't automatically scroll the container.
**How to avoid:** Use a `useRef` on the scroll container and `useEffect` that calls `scrollIntoView()` or sets `scrollTop = scrollHeight` whenever messages change.
**Warning signs:** Messages accumulate below the visible area.

### Pitfall 4: Double-Sending Messages
**What goes wrong:** User clicks "Send" twice quickly, or presses Enter rapidly, causing duplicate messages.
**Why it happens:** No debounce or loading guard on the submit handler.
**How to avoid:** Disable the send button and input while `loading` is true. Check loading state at the start of the submit handler.
**Warning signs:** Duplicate messages in conversation history.

### Pitfall 5: Chat Panel Breaking Layout on Small Screens
**What goes wrong:** The three-column layout (watchlist + main + chat) becomes too cramped.
**Why it happens:** Fixed column widths don't leave enough space for the main content area.
**How to avoid:** Use collapsible behavior (toggle button). Consider minimum viewport width or allow the chat to overlay on smaller screens. The spec says "desktop-first" so this is acceptable as long as the toggle works.
**Warning signs:** Overlapping content or horizontal scrollbars.

## Code Examples

### Chat API Functions (to add to lib/api.ts)
```typescript
// Source: follows existing apiFetch pattern in frontend/lib/api.ts
export interface ChatResponse {
  message: string;
  trades: Array<{
    ticker: string;
    side: string;
    quantity: number;
    price?: number;
    status?: string;
    error?: string;
  }>;
  watchlist_changes: Array<{
    ticker: string;
    action: string;
    status?: string;
    error?: string;
  }>;
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
}

export interface ChatHistoryResponse {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actions: string | null;  // JSON string, not parsed object
    created_at: string;
  }>;
}

export async function fetchChatHistory(): Promise<ChatHistoryResponse> {
  return apiFetch<ChatHistoryResponse>('/api/chat/history');
}
```

### Chat Panel Component Structure
```typescript
// Source: follows existing component patterns (Watchlist.tsx, TradeBar.tsx)
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePriceContext } from '@/context/PriceContext';
import { sendChatMessage, fetchChatHistory } from '@/lib/api';
import type { ChatMessage, ChatActions } from '@/lib/types';

export function ChatPanel() {
  const { refreshPortfolio, refreshWatchlist } = usePriceContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    fetchChatHistory().then(data => {
      const parsed = data.messages.map(m => ({
        ...m,
        actions: m.actions ? JSON.parse(m.actions) : null,
      }));
      setMessages(parsed);
    });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMsg,
      actions: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const resp = await sendChatMessage(userMsg);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: resp.message,
        actions: (resp.trades.length || resp.watchlist_changes.length)
          ? { trades: resp.trades, watchlist_changes: resp.watchlist_changes }
          : null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Refresh portfolio/watchlist if actions were taken
      if (resp.trades.length > 0) await refreshPortfolio();
      if (resp.watchlist_changes.length > 0) await refreshWatchlist();
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        actions: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, refreshPortfolio, refreshWatchlist]);

  return (/* ... */);
}
```

### Action Card Rendering
```typescript
// Source: project design spec (terminal color scheme)
function TradeCard({ trade }: { trade: ChatActions['trades'][number] }) {
  const isBuy = trade.side === 'buy';
  const color = trade.error ? 'border-red-500' : isBuy ? 'border-green-500' : 'border-red-500';
  const label = trade.error
    ? `Failed: ${trade.error}`
    : `${isBuy ? 'Bought' : 'Sold'} ${trade.quantity} ${trade.ticker} at $${trade.price?.toFixed(2)}`;

  return (
    <div className={`border-l-2 ${color} bg-terminal-bg px-2 py-1 mt-1 text-xs font-mono`}>
      {label}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Token-by-token streaming | Complete JSON response | Project decision | Simpler frontend; loading indicator instead of streaming UI |
| WebSocket chat | HTTP POST + response | Project decision | No persistent connection management needed for chat |
| Client-side LLM parsing | Server-side structured outputs | LiteLLM `response_format` | Backend handles all parsing; frontend gets clean JSON |

**Deprecated/outdated:**
- Token streaming for chat: explicitly out of scope per PLAN.md and REQUIREMENTS.md

## Open Questions

1. **Chat panel initial state (open or closed)**
   - What we know: PLAN.md says "docked/collapsible sidebar"
   - What's unclear: Should it start open or closed on first load?
   - Recommendation: Start closed to maximize trading terminal real estate; add a prominent toggle button in the header

2. **Chat history on page refresh**
   - What we know: Backend stores all messages in `chat_messages` table; `GET /api/chat/history` returns last 50
   - What's unclear: Should chat history persist across sessions?
   - Recommendation: Yes, load history on mount -- this is already supported by the backend. Gives a seamless experience.

3. **Chat panel toggle persistence**
   - What we know: Panel can be toggled open/closed
   - What's unclear: Should the open/closed state persist in localStorage?
   - Recommendation: Not needed for v1 -- simple useState is sufficient. Can add later if desired.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (FE) | Jest 30 + React Testing Library 16 |
| Framework (BE) | pytest 8.3 + pytest-asyncio 0.24 |
| Config file (FE) | `frontend/jest.config.ts` |
| Config file (BE) | `backend/pyproject.toml` [tool.pytest.ini_options] |
| Quick run command (FE) | `cd frontend && npx jest --passWithNoTests` |
| Quick run command (BE) | `cd backend && uv run --extra dev pytest tests/routes/test_chat.py tests/llm/ -x` |
| Full suite command (FE) | `cd frontend && npx jest` |
| Full suite command (BE) | `cd backend && uv run --extra dev pytest -v` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Chat panel renders with input and scrolling message list | unit (FE) | `cd frontend && npx jest __tests__/ChatPanel.test.tsx -x` | No -- Wave 0 |
| CHAT-02 | Loading indicator visible during API call | unit (FE) | `cd frontend && npx jest __tests__/ChatPanel.test.tsx -x` | No -- Wave 0 |
| CHAT-03 | AI trade execution works end-to-end | unit (BE) | `cd backend && uv run --extra dev pytest tests/routes/test_chat.py::TestChat::test_chat_buy_trade -x` | Yes |
| CHAT-04 | Action confirmation cards render for trades and watchlist changes | unit (FE) | `cd frontend && npx jest __tests__/ChatActionCard.test.tsx -x` | No -- Wave 0 |
| CHAT-05 | AI portfolio analysis returns substantive response | unit (BE) | `cd backend && uv run --extra dev pytest tests/llm/test_service.py::TestChatWithLlmMock::test_portfolio_analysis -x` | Yes |
| CHAT-06 | AI watchlist changes execute and reflect | unit (BE) | `cd backend && uv run --extra dev pytest tests/routes/test_chat.py::TestChat::test_chat_watchlist_change -x` | Yes |

### Sampling Rate
- **Per task commit:** `cd frontend && npx jest --passWithNoTests` + `cd backend && uv run --extra dev pytest tests/routes/test_chat.py tests/llm/ -x`
- **Per wave merge:** `cd frontend && npx jest` + `cd backend && uv run --extra dev pytest -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/ChatPanel.test.tsx` -- covers CHAT-01, CHAT-02
- [ ] `frontend/__tests__/ChatActionCard.test.tsx` -- covers CHAT-04
- [ ] No new framework or fixture dependencies needed -- existing Jest + RTL setup is sufficient
- [ ] No backend test gaps -- CHAT-03, CHAT-05, CHAT-06 already have passing tests

## Sources

### Primary (HIGH confidence)
- **Backend source code** (direct read): `backend/app/llm/service.py`, `backend/app/llm/models.py`, `backend/app/llm/mock.py`, `backend/app/routes/chat.py`, `backend/app/db/repository.py` -- all endpoints verified from source
- **Frontend source code** (direct read): `frontend/lib/types.ts` (ChatMessage, ChatActions types already defined), `frontend/lib/api.ts` (apiFetch pattern), `frontend/app/page.tsx` (layout grid), `frontend/context/PriceContext.tsx` (refreshPortfolio/refreshWatchlist available)
- **Backend tests** (direct read): `backend/tests/routes/test_chat.py`, `backend/tests/llm/test_service.py` -- all chat backend tests pass
- **Cerebras skill** (direct read): `.claude/skills/cerebras/SKILL.md` -- confirms LiteLLM + OpenRouter + `openrouter/openai/gpt-oss-120b` + `provider.order: ["cerebras"]`
- **PLAN.md** (project spec): Layout requirements, "no token streaming" decision, chat panel description

### Secondary (MEDIUM confidence)
- None needed -- all findings verified from source code

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies needed; everything already installed and verified from source
- Architecture: HIGH -- backend is complete and tested; frontend follows established patterns from existing components
- Pitfalls: HIGH -- identified from direct code reading (actions JSON string, refresh pattern, scroll behavior)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- no external dependencies changing)
