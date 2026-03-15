'use client';

import type { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatMessageProps {
  message: ChatMessageType;
  children?: React.ReactNode;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ChatMessage({ message, children }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      data-testid="chat-message"
      data-role={message.role}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? 'bg-terminal-purple/20 border border-terminal-purple/30'
            : 'bg-terminal-surface border border-terminal-border'
        }`}
      >
        <div className="text-terminal-muted text-xs mb-1">
          {isUser ? 'You' : 'FinAlly'}
        </div>
        <div className="text-terminal-text text-sm font-mono whitespace-pre-wrap">
          {message.content}
        </div>
        {children}
        <div data-testid="chat-time" className="text-terminal-muted text-xs mt-1 text-right">
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
