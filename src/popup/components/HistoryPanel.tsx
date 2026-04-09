import refreshIconUrl from '../../assets/icons/refresh.svg';
import type { Conversation, ConversationSummary } from '../../types/chat';

export function HistoryPanel({
  activeConversation,
  conversationHistory,
  onOpenConversation,
  onRefreshContext,
}: {
  activeConversation: Conversation | null;
  conversationHistory: ConversationSummary[];
  onOpenConversation: (conversationId: string) => void;
  onRefreshContext: () => void;
}) {
  return (
    <section className="history-list history-list--scrollable">
      {conversationHistory.length === 0 ? (
        <section className="card card--accent-soft">
          <h2>No conversation history yet</h2>
          <p className="helper-text helper-text--body">
            Ask a grounded question and your conversation history will appear
            here.
          </p>
          <div className="empty-state-actions">
            <button
              className="button button--secondary"
              onClick={onRefreshContext}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                className="button-icon"
                src={refreshIconUrl}
              />
              Refresh
            </button>
          </div>
        </section>
      ) : (
        conversationHistory.map((conversation) => {
          const isSelected = activeConversation?.id === conversation.id;

          return (
            <button
              className={`provider-card${isSelected ? ' provider-card--selected' : ''}`}
              key={conversation.id}
              onClick={() => onOpenConversation(conversation.id)}
              type="button"
            >
              <div className="provider-card__row">
                <span className="provider-card__title">
                  {conversation.title}
                </span>
                <span className="model-badge model-badge--muted">
                  {conversation.provider}
                </span>
              </div>
              <span className="provider-card__meta">
                {conversation.hostname}
              </span>
              <span className="provider-card__description">
                {conversation.messageCount} messages · {conversation.model}
              </span>
              <span className="helper-text helper-text--tight">
                Updated {new Date(conversation.updatedAt).toLocaleString()}
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}
