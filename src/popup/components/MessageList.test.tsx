import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageList } from './MessageList';

describe('MessageList', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders user and assistant labels with markdown content', () => {
    render(
      <MessageList
        isAssistantThinking={false}
        conversationMessages={[
          {
            content: 'Hello there',
            createdAt: '2025-01-01T00:00:00.000Z',
            id: '1',
            role: 'user',
          },
          {
            content: 'Here is a **bold** reply.',
            createdAt: '2025-01-01T00:00:01.000Z',
            id: '2',
            role: 'assistant',
          },
        ]}
        onOpenHistoryPanel={() => {}}
      />,
    );

    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getAllByText('Website').length).toBeGreaterThan(0);
    expect(screen.getByText('bold')).toBeTruthy();
  });

  it('renders the typing indicator when the assistant is thinking', () => {
    render(
      <MessageList
        isAssistantThinking
        conversationMessages={[
          {
            content: 'Hello there',
            createdAt: '2025-01-01T00:00:00.000Z',
            id: '1',
            role: 'user',
          },
        ]}
        onOpenHistoryPanel={() => {}}
      />,
    );

    expect(screen.getByText('Website')).toBeTruthy();
    expect(screen.getByText('Website is typing')).toBeTruthy();
  });
});
