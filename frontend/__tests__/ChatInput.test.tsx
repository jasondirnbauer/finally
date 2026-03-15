import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/components/ChatInput';

describe('ChatInput', () => {
  const mockOnSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a text input and a send button', () => {
    render(<ChatInput onSend={mockOnSend} />);
    expect(screen.getByPlaceholderText('Ask FinAlly anything...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('calls onSend callback with trimmed input value when send button is clicked', () => {
    render(<ChatInput onSend={mockOnSend} />);
    fireEvent.change(screen.getByPlaceholderText('Ask FinAlly anything...'), {
      target: { value: '  Buy AAPL  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockOnSend).toHaveBeenCalledWith('Buy AAPL');
  });

  it('calls onSend callback when Enter key is pressed', () => {
    render(<ChatInput onSend={mockOnSend} />);
    const input = screen.getByPlaceholderText('Ask FinAlly anything...');
    fireEvent.change(input, { target: { value: 'Sell MSFT' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockOnSend).toHaveBeenCalledWith('Sell MSFT');
  });

  it('does NOT call onSend when input is empty or whitespace-only', () => {
    render(<ChatInput onSend={mockOnSend} />);
    // Empty
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockOnSend).not.toHaveBeenCalled();

    // Whitespace only
    fireEvent.change(screen.getByPlaceholderText('Ask FinAlly anything...'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('clears input after successful send', () => {
    render(<ChatInput onSend={mockOnSend} />);
    const input = screen.getByPlaceholderText('Ask FinAlly anything...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(input.value).toBe('');
  });

  it('send button is disabled when disabled prop is true', () => {
    render(<ChatInput onSend={mockOnSend} disabled />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('input is disabled when disabled prop is true', () => {
    render(<ChatInput onSend={mockOnSend} disabled />);
    expect(screen.getByPlaceholderText('Ask FinAlly anything...')).toBeDisabled();
  });

  it('does not call onSend when disabled is true', () => {
    render(<ChatInput onSend={mockOnSend} disabled />);
    const input = screen.getByPlaceholderText('Ask FinAlly anything...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockOnSend).not.toHaveBeenCalled();
  });
});
