'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageComponent } from '@/components/ChatMessage';
import { ChatActionCard } from '@/components/ChatActionCard';
import { ChatInput } from '@/components/ChatInput';
import { sendChatMessage, fetchChatHistory } from '@/lib/api';
import { usePriceContext } from '@/context/PriceContext';
import type { ChatMessage, ChatActions } from '@/lib/types';

interface ChatPanelProps {
  onClose: () => void;
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2" data-testid="chat-loading">
      <div
        className="w-2 h-2 bg-terminal-blue rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <div
        className="w-2 h-2 bg-terminal-blue rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <div
        className="w-2 h-2 bg-terminal-blue rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { refreshPortfolio, refreshWatchlist } = usePriceContext();

  // Load chat history on mount
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const history = await fetchChatHistory();
        if (!cancelled) {
          setMessages(history);
        }
      } catch {
        // Silently ignore history load failures
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      // Optimistic user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        actions: null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const response = await sendChatMessage(text);

        // Build actions object from response if any trades or watchlist_changes exist
        let actions: ChatActions | null = null;
        const hasTrades = response.trades && response.trades.length > 0;
        const hasWatchlistChanges =
          response.watchlist_changes && response.watchlist_changes.length > 0;

        if (hasTrades || hasWatchlistChanges) {
          actions = {};
          if (hasTrades) actions.trades = response.trades;
          if (hasWatchlistChanges) actions.watchlist_changes = response.watchlist_changes;
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.message,
          actions,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Refresh data after actions
        if (hasTrades) {
          await refreshPortfolio();
        }
        if (hasWatchlistChanges) {
          await refreshWatchlist();
        }
      } catch {
        // Show error message in chat
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          actions: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [loading, refreshPortfolio, refreshWatchlist],
  );

  return (
    <div className="flex flex-col h-full bg-terminal-surface border-l border-terminal-border">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border shrink-0">
        <span className="text-terminal-yellow text-sm font-mono font-semibold">AI Assistant</span>
        <button
          onClick={onClose}
          className="text-terminal-muted hover:text-terminal-text text-lg"
          aria-label="Close chat"
        >
          &times;
        </button>
      </div>

      {/* Message list - scrollable */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        data-testid="chat-messages"
      >
        {messages.map((msg) => (
          <ChatMessageComponent key={msg.id} message={msg}>
            <ChatActionCard actions={msg.actions} />
          </ChatMessageComponent>
        ))}
        {loading && <LoadingIndicator />}
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
