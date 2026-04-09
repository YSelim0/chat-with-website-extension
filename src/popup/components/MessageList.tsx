import { useEffect, useRef } from 'react';

import historyIconUrl from '../../assets/icons/history.svg';
import type { ConversationMessage } from '../../types/chat';

export function MessageList({
  conversationMessages,
  onOpenHistoryPanel,
}: {
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
          <p className="chat-card__eyebrow">Assistant</p>
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
              <p className="chat-card__eyebrow">{message.role}</p>
              <p className="chat-card__body">{message.content}</p>
            </article>
          ))}
          <div ref={bottomAnchorRef} />
        </div>
      )}
    </section>
  );
}
