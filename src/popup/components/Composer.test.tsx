import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Composer } from './Composer';

describe('Composer', () => {
  it('keeps send enabled when a snapshot exists and submitting is false', () => {
    render(
      <Composer
        activeConversation={null}
        activeSnapshot={{
          chunkCount: 1,
          extractedAt: '2025-01-01T00:00:00.000Z',
          hostname: 'example.com',
          id: 'snapshot-1',
          textLength: 20,
          title: 'Example',
          url: 'https://example.com',
        }}
        isSubmittingQuestion={false}
        questionInput="Hello"
        setQuestionInput={() => {}}
        onAskQuestion={() => {}}
        onOpenProviderSettings={() => {}}
        onQuestionInputKeyDown={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /send/i })).toBeTruthy();
  });

  it('forwards Enter key handling to the provided handler', () => {
    const onQuestionInputKeyDown = vi.fn();

    render(
      <Composer
        activeConversation={null}
        activeSnapshot={{
          chunkCount: 1,
          extractedAt: '2025-01-01T00:00:00.000Z',
          hostname: 'example.com',
          id: 'snapshot-1',
          textLength: 20,
          title: 'Example',
          url: 'https://example.com',
        }}
        isSubmittingQuestion={false}
        questionInput="Hello"
        setQuestionInput={() => {}}
        onAskQuestion={() => {}}
        onOpenProviderSettings={() => {}}
        onQuestionInputKeyDown={onQuestionInputKeyDown}
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText('Ask about this page...'), {
      key: 'Enter',
    });

    expect(onQuestionInputKeyDown).toHaveBeenCalledTimes(1);
  });
});
