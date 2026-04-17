import type { KeyboardEvent } from 'react';

import historyIconUrl from '../../assets/icons/history.svg';
import type {
  Conversation,
  ConversationMessage,
  ConversationSummary,
} from '../../types/chat';
import type { SnapshotSummary } from '../../types/page-context';
import { Composer } from '../components/Composer';
import { HistoryPanel } from '../components/HistoryPanel';
import { MessageList } from '../components/MessageList';
import { SnapshotCard } from '../components/SnapshotCard';
import { getSnapshotAction } from '../utils/popup-helpers';

type ReadyPanel = 'chat' | 'history';

export function ConfiguredPage({
  activeConversation,
  activeHostname,
  activeSnapshot,
  conversationHistory,
  conversationMessages,
  errorMessage,
  isAssistantThinking,
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
  isAssistantThinking: boolean;
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
  const snapshotAction = getSnapshotAction(errorMessage);

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
          <div className="chat-content">
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
              isAssistantThinking={isAssistantThinking}
              conversationMessages={conversationMessages}
              onOpenHistoryPanel={onOpenHistoryPanel}
            />
          </div>
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
