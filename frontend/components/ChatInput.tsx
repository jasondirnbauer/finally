'use client';

import { useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 p-3 border-t border-terminal-border">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask FinAlly anything..."
        disabled={disabled}
        className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-terminal-text font-mono placeholder-terminal-muted focus:outline-none focus:border-terminal-blue"
      />
      <button
        onClick={handleSend}
        disabled={disabled}
        className="bg-terminal-purple hover:bg-terminal-purple/80 text-white px-4 py-2 rounded text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
}
