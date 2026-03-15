import { render, screen } from '@testing-library/react';
import { ChatMessage as ChatMessageComponent } from '@/components/ChatMessage';
import type { ChatMessage } from '@/lib/types';

describe('ChatMessage', () => {
  const userMessage: ChatMessage = {
    id: '1',
    role: 'user',
    content: 'Buy 10 shares of AAPL',
    actions: null,
    created_at: '2026-03-15T12:00:00Z',
  };

  const assistantMessage: ChatMessage = {
    id: '2',
    role: 'assistant',
    content: 'I will buy 10 shares of AAPL for you.',
    actions: null,
    created_at: '2026-03-15T12:00:05Z',
  };

  it('renders user message with content text and right-aligned styling', () => {
    render(<ChatMessageComponent message={userMessage} />);
    const msg = screen.getByTestId('chat-message');
    expect(msg).toHaveTextContent('Buy 10 shares of AAPL');
    expect(msg).toHaveAttribute('data-role', 'user');
    expect(msg.className).toMatch(/justify-end/);
  });

  it('renders assistant message with content text and left-aligned styling', () => {
    render(<ChatMessageComponent message={assistantMessage} />);
    const msg = screen.getByTestId('chat-message');
    expect(msg).toHaveTextContent('I will buy 10 shares of AAPL for you.');
    expect(msg).toHaveAttribute('data-role', 'assistant');
    expect(msg.className).toMatch(/justify-start/);
  });

  it('user messages use a distinct background color', () => {
    render(<ChatMessageComponent message={userMessage} />);
    const msg = screen.getByTestId('chat-message');
    const bubble = msg.querySelector('[class*="bg-terminal-purple"]');
    expect(bubble).toBeInTheDocument();
  });

  it('assistant messages use terminal-surface background', () => {
    render(<ChatMessageComponent message={assistantMessage} />);
    const msg = screen.getByTestId('chat-message');
    const bubble = msg.querySelector('[class*="bg-terminal-surface"]');
    expect(bubble).toBeInTheDocument();
  });

  it('does NOT render action cards (just renders text)', () => {
    const msgWithActions: ChatMessage = {
      ...assistantMessage,
      actions: {
        trades: [{ ticker: 'AAPL', side: 'buy', quantity: 10, price: 190.5, status: 'executed' }],
      },
    };
    render(<ChatMessageComponent message={msgWithActions} />);
    // ChatMessage itself should not render trade cards; that is the parent's job via children
    expect(screen.queryByTestId('trade-card')).not.toBeInTheDocument();
  });

  it('renders timestamp in a human-readable format', () => {
    render(<ChatMessageComponent message={userMessage} />);
    // Should display some form of the time, not the raw ISO string
    const msg = screen.getByTestId('chat-message');
    // Expect a time display element exists (not the raw ISO)
    expect(msg.textContent).not.toContain('2026-03-15T12:00:00Z');
    // Should contain some formatted time
    const timeEl = msg.querySelector('time, [data-testid="chat-time"]');
    expect(timeEl).toBeInTheDocument();
  });

  it('renders children below the content (slot for action cards)', () => {
    render(
      <ChatMessageComponent message={assistantMessage}>
        <div data-testid="child-slot">Action card here</div>
      </ChatMessageComponent>,
    );
    expect(screen.getByTestId('child-slot')).toBeInTheDocument();
    expect(screen.getByTestId('child-slot')).toHaveTextContent('Action card here');
  });
});
