import { useEffect, useRef } from 'react';

import historyIconUrl from '../../assets/icons/history.svg';
import type { ConversationMessage } from '../../types/chat';
import { MarkdownMessage } from './MarkdownMessage';

function getMessageAuthorLabel(role: ConversationMessage['role']) {
  if (role === 'assistant') {
    return 'Website';
  }

  if (role === 'user') {
    return 'You';
  }

  return role;
}

export function MessageList({
  isAssistantThinking,
  conversationMessages,
  onOpenHistoryPanel,
}: {
  isAssistantThinking: boolean;
  conversationMessages: ConversationMessage[];
  onOpenHistoryPanel: () => void;
}) {
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollContainerRef.current || !bottomAnchorRef.current) {
      return;
    }

    bottomAnchorRef.current.scrollIntoView({
      block: 'end',
      behavior: 'auto',
    });
  });

  return (
    <section
      className="chat-card chat-card--scrollable"
      ref={scrollContainerRef}
    >
      {conversationMessages.length === 0 ? (
        <div className="empty-state-block">
          <p className="chat-card__eyebrow">Website</p>
          <p className="chat-card__body">
            Ask a question about the current page. Responses will use only the
            saved snapshot context.
          </p>
          <div className="empty-state-actions">
            <button
              className="button button--secondary"
              onClick={onOpenHistoryPanel}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                className="button-icon"
                src={historyIconUrl}
              />
              Open history
            </button>
          </div>
        </div>
      ) : (
        <div className="message-list">
          {conversationMessages.map((message) => (
            <article
              className={`message-bubble message-bubble--${message.role}`}
              key={message.id}
            >
              <p className="chat-card__eyebrow">
                {getMessageAuthorLabel(message.role)}
              </p>
              {message.role === 'assistant' ? (
                <MarkdownMessage content={message.content} />
              ) : (
                <p className="chat-card__body">{message.content}</p>
              )}
            </article>
          ))}
          {isAssistantThinking ? (
            <article className="message-bubble message-bubble--assistant message-bubble--thinking">
              <p className="chat-card__eyebrow">Website</p>
              <div className="thinking-dots" role="status" aria-live="polite">
                <span className="sr-only">Website is typing</span>
                <span />
                <span />
                <span />
              </div>
            </article>
          ) : null}
          <div ref={bottomAnchorRef} />
        </div>
      )}
    </section>
  );
}
