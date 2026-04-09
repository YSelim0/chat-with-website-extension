import type { KeyboardEvent } from 'react';

import editIconUrl from '../../assets/icons/edit.svg';
import sendIconUrl from '../../assets/icons/send.svg';
import type { Conversation } from '../../types/chat';
import type { SnapshotSummary } from '../../types/page-context';

export function Composer({
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
