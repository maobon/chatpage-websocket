import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../../components/ChatInput';
import React from 'react';

describe('ChatInput', () => {
  const mockProps = {
    authSession: { accessToken: 't', tokenType: 'Bearer', username: 'u' },
    connectionStatus: 'open' as const,
    error: '',
    input: '',
    inputRef: { current: null },
    onInputChange: vi.fn(),
    onSend: vi.fn().mockReturnValue(true),
    onSendImage: vi.fn().mockReturnValue(true),
    websocketUrl: 'ws://test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onInputChange when typing', () => {
    render(<ChatInput {...mockProps} />);
    const textarea = screen.getByPlaceholderText(/输入消息/);
    fireEvent.change(textarea, { target: { value: 'hello' } });
    expect(mockProps.onInputChange).toHaveBeenCalledWith('hello');
  });

  it('should call onSend when clicking send button', () => {
    const propsWithInput = { ...mockProps, input: 'hello' };
    render(<ChatInput {...propsWithInput} />);
    const sendButton = screen.getByLabelText('发送消息');
    fireEvent.click(sendButton);
    expect(mockProps.onSend).toHaveBeenCalledWith('hello');
  });

  it('should disabled send button when input is empty', () => {
    render(<ChatInput {...mockProps} input="" />);
    const sendButton = screen.getByLabelText('发送消息');
    expect(sendButton).toBeDisabled();
  });

  it('should show emoji picker when clicking emoji button', () => {
    render(<ChatInput {...mockProps} />);
    const emojiButton = screen.getByLabelText('表情符号');
    fireEvent.click(emojiButton);

    // 检查是否显示了表情列表（COMMON_EMOJIS 中的第一个）
    expect(screen.getByText('😀')).toBeInTheDocument();
  });
});
