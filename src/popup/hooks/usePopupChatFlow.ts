import { nanoid } from 'nanoid';

import { getDefaultModelForProvider } from '../../lib/providers/catalog';
import {
  getConversationById,
  listConversationSummaries,
} from '../../lib/storage/conversations';
import { getPageSnapshotSummaryById } from '../../lib/storage/page-snapshots';
import {
  getSavedApiKey,
  saveProviderConfiguration,
} from '../../lib/storage/settings';
import type { AskQuestionResponse } from '../../types/chat';
import type { ExtractActivePageResponse } from '../../types/page-context';
import type { PopupSessionState } from '../context/PopupSessionContext';
import {
  getInitialSelectedModel,
  MINIMUM_SCANNING_DURATION_MS,
  MODEL_PAGE_SIZE,
  POPUP_EXTRACTION_TIMEOUT_MS,
  withTimeout,
} from '../utils/popup-helpers';

export function usePopupChatFlow({
  activeSnapshot,
  apiKeyInput,
  conversationMessages,
  isSubmittingQuestion,
  questionInput,
  selectedModelId,
  selectedProvider,
  setSessionState,
  settings,
}: {
  activeSnapshot: PopupSessionState['activeSnapshot'];
  apiKeyInput: string;
  conversationMessages: PopupSessionState['conversationMessages'];
  isSubmittingQuestion: boolean;
  questionInput: string;
  selectedModelId: string;
  selectedProvider: PopupSessionState['selectedProvider'];
  setSessionState: (payload: Partial<PopupSessionState>) => void;
  settings: PopupSessionState['settings'];
}) {
  async function runActivePageExtraction() {
    const startedAt = Date.now();

    setSessionState({ screen: 'scanning', errorMessage: null });

    let response: ExtractActivePageResponse;

    try {
      response = (await withTimeout(
        chrome.runtime.sendMessage({
          type: 'page-context:extract-active-page',
        }),
        POPUP_EXTRACTION_TIMEOUT_MS,
        'Scanning took too long. Please refresh the tab and try again.',
      )) as ExtractActivePageResponse;
    } catch (error) {
      setSessionState({
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Scanning failed before the page context was returned.',
        screen: 'ready',
      });
      return;
    }

    if (!response.ok) {
      const remainingDelay =
        MINIMUM_SCANNING_DURATION_MS - (Date.now() - startedAt);

      if (remainingDelay > 0) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, remainingDelay);
        });
      }

      setSessionState({ errorMessage: response.error, screen: 'ready' });
      return;
    }

    const remainingDelay =
      MINIMUM_SCANNING_DURATION_MS - (Date.now() - startedAt);

    if (remainingDelay > 0) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, remainingDelay);
      });
    }

    setSessionState({
      latestSnapshot: response.snapshot,
      activeSnapshot: response.snapshot,
      activeConversation: null,
      conversationMessages: [],
      readyPanel: 'chat',
      screen: 'ready',
    });
  }

  async function handleSaveProviderConfiguration() {
    const trimmedApiKey = apiKeyInput.trim();

    if (!trimmedApiKey) {
      setSessionState({
        screen: 'provider-setup',
        errorMessage: 'Enter an API key before continuing.',
      });
      return;
    }

    if (!selectedModelId) {
      setSessionState({
        errorMessage: 'Choose a default model before continuing.',
      });
      return;
    }

    try {
      setSessionState({ isSaving: true, errorMessage: null });

      const nextSettings = await saveProviderConfiguration(
        selectedProvider,
        trimmedApiKey,
        selectedModelId,
      );

      setSessionState({ settings: nextSettings });
      await runActivePageExtraction();
    } catch (error) {
      console.error('Failed to save provider configuration.', error);
      setSessionState({
        errorMessage: 'Failed to save the provider configuration locally.',
      });
    } finally {
      setSessionState({ isSaving: false });
    }
  }

  function handleOpenProviderSettings() {
    setSessionState({
      apiKeyInput: settings ? getSavedApiKey(settings, selectedProvider) : '',
      selectedModelId: settings
        ? getInitialSelectedModel(settings, selectedProvider)
        : (getDefaultModelForProvider(selectedProvider)?.id ?? ''),
      modelSearchQuery: '',
      visibleModelCount: MODEL_PAGE_SIZE,
      conversationMessages: [],
      activeConversation: null,
      errorMessage: null,
      screen: 'provider-setup',
    });
  }

  async function handleRefreshContext() {
    try {
      setSessionState({ isRefreshingContext: true });
      await runActivePageExtraction();
    } finally {
      setSessionState({ isRefreshingContext: false });
    }
  }

  async function handleAskQuestion() {
    const trimmedQuestion = questionInput.trim();

    if (!trimmedQuestion) {
      setSessionState({ errorMessage: 'Enter a question before sending it.' });
      return;
    }

    if (!activeSnapshot) {
      setSessionState({
        errorMessage:
          'Scan the page context before asking a grounded question.',
      });
      return;
    }

    try {
      setSessionState({
        conversationMessages: [
          ...conversationMessages,
          {
            content: trimmedQuestion,
            createdAt: new Date().toISOString(),
            id: nanoid(),
            role: 'user',
          },
        ],
        errorMessage: null,
        isAssistantThinking: true,
        isSubmittingQuestion: true,
        questionInput: '',
      });

      const response = (await chrome.runtime.sendMessage({
        payload: {
          model: selectedModelId,
          provider: selectedProvider,
          question: trimmedQuestion,
          snapshotId: activeSnapshot.id,
        },
        type: 'chat:ask-question',
      })) as AskQuestionResponse;

      if (!response.ok) {
        setSessionState({
          errorMessage: response.error,
          isAssistantThinking: false,
        });
        return;
      }

      setSessionState({
        activeConversation: response.conversation,
        conversationMessages: response.messages,
        conversationHistory: await listConversationSummaries(),
        isAssistantThinking: false,
      });
    } catch (error) {
      setSessionState({
        errorMessage:
          error instanceof Error
            ? error.message
            : 'The grounded chat request failed unexpectedly.',
        isAssistantThinking: false,
      });
    } finally {
      setSessionState({ isSubmittingQuestion: false });
    }
  }

  function handleQuestionInputKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isSubmittingQuestion) {
      return;
    }

    void handleAskQuestion();
  }

  async function handleOpenConversation(conversationId: string) {
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      setSessionState({
        errorMessage: 'The selected conversation could not be loaded.',
      });
      return;
    }

    const snapshotSummary = await getPageSnapshotSummaryById(
      conversation.conversation.snapshotId,
    );

    if (!snapshotSummary) {
      setSessionState({
        errorMessage: 'The selected conversation snapshot could not be loaded.',
      });
      return;
    }

    setSessionState({
      activeConversation: conversation.conversation,
      activeSnapshot: snapshotSummary,
      conversationMessages: conversation.messages,
      readyPanel: 'chat',
      errorMessage: null,
    });
  }

  return {
    handleAskQuestion,
    handleOpenConversation,
    handleOpenProviderSettings,
    handleQuestionInputKeyDown,
    handleRefreshContext,
    handleSaveProviderConfiguration,
  };
}
