import { type KeyboardEvent, useEffect, useRef } from 'react';

import editIconUrl from '../../assets/icons/edit.svg';
import historyIconUrl from '../../assets/icons/history.svg';
import refreshIconUrl from '../../assets/icons/refresh.svg';
import sendIconUrl from '../../assets/icons/send.svg';
import type {
  Conversation,
  ConversationMessage,
  ConversationSummary,
} from '../../types/chat';
import type { SnapshotSummary } from '../../types/page-context';
import { getSnapshotAction, getSnapshotHelpText } from '../utils/popup-helpers';

type ReadyPanel = 'chat' | 'history';

export function ConfiguredPage({
  activeConversation,
  activeHostname,
  activeSnapshot,
  conversationHistory,
  conversationMessages,
  errorMessage,
  isRefreshingContext,
  isSubmittingQuestion,
  isUsingLiveSnapshot,
  latestSnapshot,
  modelLabel,
  questionInput,
  readyPanel,
  setQuestionInput,
  onAskQuestion,
  onOpenConversation,
  onOpenHistoryPanel,
  onOpenProviderSettings,
  onQuestionInputKeyDown,
  onRefreshContext,
  onReturnToChatPanel,
}: {
  activeConversation: Conversation | null;
  activeHostname: string | null;
  activeSnapshot: SnapshotSummary | null;
  conversationHistory: ConversationSummary[];
  conversationMessages: ConversationMessage[];
  errorMessage: string | null;
  isRefreshingContext: boolean;
  isSubmittingQuestion: boolean;
  isUsingLiveSnapshot: boolean;
  latestSnapshot: SnapshotSummary | null;
  modelLabel: string;
  questionInput: string;
  readyPanel: ReadyPanel;
  setQuestionInput: (nextValue: string) => void;
  onAskQuestion: () => void;
  onOpenConversation: (conversationId: string) => void;
  onOpenHistoryPanel: () => void;
  onOpenProviderSettings: () => void;
  onQuestionInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onRefreshContext: () => void;
  onReturnToChatPanel: () => void;
}) {
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const snapshotAction = getSnapshotAction(errorMessage);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  });

  return (
    <section className="screen-panel screen-panel--chat">
      <header className="screen-header screen-header--chat">
        <div className="chat-header-copy">
          <h1>Chat on {activeHostname ?? 'this website'}</h1>
          <p className="subtitle">
            OpenRouter configured. Default model: {modelLabel}.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="button button--secondary"
            onClick={
              readyPanel === 'history'
                ? onReturnToChatPanel
                : onOpenHistoryPanel
            }
            type="button"
          >
            <img
              alt=""
              aria-hidden="true"
              className="button-icon"
              src={historyIconUrl}
            />
            {readyPanel === 'history' ? 'Chat' : 'History'}
          </button>
          <div className="status-pill">Setup complete</div>
        </div>
      </header>

      {readyPanel === 'history' ? (
        <HistoryPanel
          activeConversation={activeConversation}
          conversationHistory={conversationHistory}
          onOpenConversation={onOpenConversation}
          onRefreshContext={onRefreshContext}
        />
      ) : (
        <>
          <SnapshotCard
            activeHostname={activeHostname}
            activeSnapshot={activeSnapshot}
            errorMessage={errorMessage}
            isRefreshingContext={isRefreshingContext}
            isUsingLiveSnapshot={isUsingLiveSnapshot}
            latestSnapshot={latestSnapshot}
            snapshotAction={snapshotAction}
            onOpenProviderSettings={onOpenProviderSettings}
            onRefreshContext={onRefreshContext}
          />
          <MessageList
            conversationMessages={conversationMessages}
            messageListRef={messageListRef}
            onOpenHistoryPanel={onOpenHistoryPanel}
          />
          <Composer
            activeConversation={activeConversation}
            activeSnapshot={activeSnapshot}
            isSubmittingQuestion={isSubmittingQuestion}
            questionInput={questionInput}
            setQuestionInput={setQuestionInput}
            onAskQuestion={onAskQuestion}
            onOpenProviderSettings={onOpenProviderSettings}
            onQuestionInputKeyDown={onQuestionInputKeyDown}
          />
        </>
      )}
    </section>
  );
}

function HistoryPanel({
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

function SnapshotCard({
  activeHostname,
  activeSnapshot,
  errorMessage,
  isRefreshingContext,
  isUsingLiveSnapshot,
  latestSnapshot,
  snapshotAction,
  onOpenProviderSettings,
  onRefreshContext,
}: {
  activeHostname: string | null;
  activeSnapshot: SnapshotSummary | null;
  errorMessage: string | null;
  isRefreshingContext: boolean;
  isUsingLiveSnapshot: boolean;
  latestSnapshot: SnapshotSummary | null;
  snapshotAction: 'refresh' | 'setup' | null;
  onOpenProviderSettings: () => void;
  onRefreshContext: () => void;
}) {
  return (
    <section className="card card--accent-soft snapshot-card">
      <div className="snapshot-card__header">
        <div>
          <h2>Page snapshot</h2>
          <p className="helper-text helper-text--tight">
            {isUsingLiveSnapshot ? 'Live page context' : 'Archived snapshot'}
          </p>
        </div>
        <button
          className="button button--secondary"
          disabled={isRefreshingContext}
          onClick={onRefreshContext}
          type="button"
        >
          <img
            alt=""
            aria-hidden="true"
            className="button-icon"
            src={refreshIconUrl}
          />
          {isRefreshingContext ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {activeSnapshot ? (
        <div className="snapshot-meta">
          <p className="helper-text helper-text--body">
            {activeSnapshot.title}
          </p>
          <p className="helper-text helper-text--tight">
            {activeSnapshot.chunkCount} chunks · {activeSnapshot.textLength}{' '}
            characters
          </p>
          <p className="helper-text helper-text--tight">
            Extracted at {new Date(activeSnapshot.extractedAt).toLocaleString()}
          </p>
          {latestSnapshot && !isUsingLiveSnapshot ? (
            <p className="helper-text helper-text--tight">
              A newer live snapshot exists for {latestSnapshot.hostname}.
              Refresh to switch.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="empty-state-block">
          <p className="helper-text helper-text--body">
            {getSnapshotHelpText(errorMessage, activeHostname)}
          </p>
          <div className="empty-state-actions">
            {snapshotAction === 'refresh' ? (
              <button
                className="button button--secondary"
                disabled={isRefreshingContext}
                onClick={onRefreshContext}
                type="button"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="button-icon"
                  src={refreshIconUrl}
                />
                Retry scan
              </button>
            ) : null}
            {snapshotAction === 'setup' ? (
              <button
                className="button button--secondary"
                onClick={onOpenProviderSettings}
                type="button"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="button-icon"
                  src={editIconUrl}
                />
                Change model
              </button>
            ) : null}
            {!snapshotAction ? (
              <button
                className="button button--secondary"
                disabled={isRefreshingContext}
                onClick={onRefreshContext}
                type="button"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="button-icon"
                  src={refreshIconUrl}
                />
                Scan page
              </button>
            ) : null}
          </div>
        </div>
      )}

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
    </section>
  );
}

function MessageList({
  conversationMessages,
  messageListRef,
  onOpenHistoryPanel,
}: {
  conversationMessages: ConversationMessage[];
  messageListRef: React.RefObject<HTMLDivElement | null>;
  onOpenHistoryPanel: () => void;
}) {
  return (
    <section className="chat-card chat-card--scrollable">
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
        <div className="message-list" ref={messageListRef}>
          {conversationMessages.map((message) => (
            <article
              className={`message-bubble message-bubble--${message.role}`}
              key={message.id}
            >
              <p className="chat-card__eyebrow">{message.role}</p>
              <p className="chat-card__body">{message.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Composer({
  activeConversation,
  activeSnapshot,
  isSubmittingQuestion,
  questionInput,
  setQuestionInput,
  onAskQuestion,
  onOpenProviderSettings,
  onQuestionInputKeyDown,
}: {
  activeConversation: Conversation | null;
  activeSnapshot: SnapshotSummary | null;
  isSubmittingQuestion: boolean;
  questionInput: string;
  setQuestionInput: (nextValue: string) => void;
  onAskQuestion: () => void;
  onOpenProviderSettings: () => void;
  onQuestionInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <section className="composer-card">
      <textarea
        className="composer-input"
        disabled={!activeSnapshot}
        onChange={(event) => setQuestionInput(event.target.value)}
        onKeyDown={onQuestionInputKeyDown}
        placeholder="Ask about this page..."
        rows={4}
        value={questionInput}
      />
      <div className="composer-card__footer">
        <p className="helper-text helper-text--tight">
          {activeConversation
            ? 'Continuing the selected snapshot conversation.'
            : 'Source-only answers will use the active page snapshot.'}
        </p>
        <div className="inline-actions">
          <button
            className="button button--secondary"
            onClick={onOpenProviderSettings}
            type="button"
          >
            <img
              alt=""
              aria-hidden="true"
              className="button-icon"
              src={editIconUrl}
            />
            Setup
          </button>
          <button
            className="button button--primary"
            disabled={isSubmittingQuestion || !activeSnapshot}
            onClick={onAskQuestion}
            type="button"
          >
            <img
              alt=""
              aria-hidden="true"
              className="button-icon"
              src={sendIconUrl}
            />
            {isSubmittingQuestion ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}
