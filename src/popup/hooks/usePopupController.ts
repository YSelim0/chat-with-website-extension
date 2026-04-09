import { type KeyboardEvent, useEffect, useMemo } from 'react';

import { getActiveTabHostname } from '../../lib/browser/active-tab';
import {
  getDefaultModelForProvider,
  getProviderDefinition,
} from '../../lib/providers/catalog';
import {
  getConversationById,
  getConversationBySnapshotId,
  listConversationSummaries,
} from '../../lib/storage/conversations';
import {
  getLatestSnapshotForHostname,
  getPageSnapshotSummaryById,
} from '../../lib/storage/page-snapshots';
import {
  getExtensionSettings,
  getSavedApiKey,
  saveProviderConfiguration,
} from '../../lib/storage/settings';
import type { AskQuestionResponse } from '../../types/chat';
import type { ExtractActivePageResponse } from '../../types/page-context';
import type { ListOpenRouterModelsResponse } from '../../types/provider-models';
import { usePopupSession } from '../context/PopupSessionContext';
import {
  filterModels,
  getInitialSelectedModel,
  getInitialSelectedProvider,
  MINIMUM_SCANNING_DURATION_MS,
  MODEL_PAGE_SIZE,
  POPUP_EXTRACTION_TIMEOUT_MS,
  withTimeout,
} from '../utils/popup-helpers';

export type PopupScreen =
  | 'loading'
  | 'welcome'
  | 'provider-setup'
  | 'model-selection'
  | 'scanning'
  | 'ready';

export type ReadyPanel = 'chat' | 'history';

export function usePopupController() {
  const {
    activeConversation,
    activeHostname,
    activeSnapshot,
    apiKeyInput,
    conversationHistory,
    conversationMessages,
    errorMessage,
    isLoadingOpenRouterModels,
    isRefreshingContext,
    isSaving,
    isSubmittingQuestion,
    latestSnapshot,
    modelSearchQuery,
    openRouterModels,
    openRouterModelError,
    questionInput,
    readyPanel,
    screen,
    selectedModelId,
    selectedProvider,
    settings,
    setSessionState,
    showFreeOpenRouterModelsOnly,
    visibleModelCount,
  } = usePopupSession();

  const selectedProviderDefinition = useMemo(() => {
    return getProviderDefinition(selectedProvider);
  }, [selectedProvider]);

  const selectedModelDefinition = useMemo(() => {
    return selectedProviderDefinition?.models.find(
      (model) => model.id === selectedModelId,
    );
  }, [selectedModelId, selectedProviderDefinition]);

  const availableModels = useMemo(() => {
    if (!selectedProviderDefinition) {
      return [];
    }

    if (selectedProvider !== 'openrouter') {
      return selectedProviderDefinition.models;
    }

    return openRouterModels.length > 0
      ? openRouterModels
      : selectedProviderDefinition.models;
  }, [openRouterModels, selectedProvider, selectedProviderDefinition]);

  const filteredModels = useMemo(() => {
    return filterModels({
      availableModels,
      modelSearchQuery,
      selectedProvider,
      showFreeOpenRouterModelsOnly,
    });
  }, [
    availableModels,
    modelSearchQuery,
    selectedProvider,
    showFreeOpenRouterModelsOnly,
  ]);

  const selectedModelFromAvailableList = useMemo(() => {
    return (
      availableModels.find((model) => model.id === selectedModelId) ?? null
    );
  }, [availableModels, selectedModelId]);

  const visibleModels = useMemo(() => {
    return filteredModels.slice(0, visibleModelCount);
  }, [filteredModels, visibleModelCount]);

  const hasMoreModels = filteredModels.length > visibleModels.length;
  const isUsingLiveSnapshot =
    Boolean(activeSnapshot?.id) && activeSnapshot?.id === latestSnapshot?.id;

  useEffect(() => {
    let isMounted = true;

    async function loadPopupState() {
      try {
        const [storedSettings, hostname] = await Promise.all([
          getExtensionSettings(),
          getActiveTabHostname(),
        ]);

        if (!isMounted) {
          return;
        }

        const initialProvider = getInitialSelectedProvider(storedSettings);

        setSessionState({
          settings: storedSettings,
          selectedProvider: initialProvider,
          selectedModelId: getInitialSelectedModel(
            storedSettings,
            initialProvider,
          ),
          apiKeyInput: getSavedApiKey(storedSettings, initialProvider),
          activeHostname: hostname,
        });

        const history = await listConversationSummaries();
        setSessionState({ conversationHistory: history });

        if (hostname) {
          const latestSnapshotForHostname =
            await getLatestSnapshotForHostname(hostname);

          setSessionState({
            latestSnapshot: latestSnapshotForHostname,
            activeSnapshot: latestSnapshotForHostname,
          });

          if (latestSnapshotForHostname) {
            const existingConversation = await getConversationBySnapshotId(
              latestSnapshotForHostname.id,
            );

            setSessionState({
              activeConversation: existingConversation?.conversation ?? null,
              conversationMessages: existingConversation?.messages ?? [],
            });
          }
        }

        setSessionState({
          screen: storedSettings.hasCompletedOnboarding ? 'ready' : 'welcome',
        });
      } catch (error) {
        console.error('Failed to initialize popup state.', error);

        if (!isMounted) {
          return;
        }

        setSessionState({
          errorMessage:
            'Failed to load extension settings. Please reopen the popup.',
          screen: 'welcome',
        });
      }
    }

    loadPopupState();

    return () => {
      isMounted = false;
    };
  }, [setSessionState]);

  useEffect(() => {
    if (screen !== 'model-selection' || selectedProvider !== 'openrouter') {
      return;
    }

    let isMounted = true;

    async function loadOpenRouterModels() {
      try {
        setSessionState({
          isLoadingOpenRouterModels: true,
          openRouterModelError: null,
        });

        const response = (await chrome.runtime.sendMessage({
          type: 'openrouter:list-models',
        })) as ListOpenRouterModelsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setSessionState({
            openRouterModelError: response.error,
            openRouterModels: [],
          });
          return;
        }

        setSessionState({ openRouterModels: response.models });

        const hasCurrentSelection = response.models.some(
          (model) => model.id === selectedModelId,
        );

        if (hasCurrentSelection) {
          return;
        }

        const preferredModel =
          response.models.find(
            (model) => model.id === 'qwen/qwen3.6-plus:free',
          ) ||
          response.models.find((model) => model.isFree) ||
          response.models[0];

        if (preferredModel) {
          setSessionState({ selectedModelId: preferredModel.id });
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSessionState({
          openRouterModelError:
            error instanceof Error
              ? error.message
              : 'Failed to load the OpenRouter model list.',
          openRouterModels: [],
        });
      } finally {
        if (isMounted) {
          setSessionState({ isLoadingOpenRouterModels: false });
        }
      }
    }

    void loadOpenRouterModels();

    return () => {
      isMounted = false;
    };
  }, [screen, selectedModelId, selectedProvider, setSessionState]);

  function handleContinueFromWelcome() {
    setSessionState({ screen: 'provider-setup' });
  }

  function handleBackToProviders() {
    setSessionState({ errorMessage: null, screen: 'welcome' });
  }

  function handleContinueToModelSelection() {
    const trimmedApiKey = apiKeyInput.trim();

    if (!trimmedApiKey) {
      setSessionState({ errorMessage: 'Enter an API key before continuing.' });
      return;
    }

    setSessionState({ errorMessage: null, screen: 'model-selection' });
  }

  function handleBackToProviderSetup() {
    setSessionState({ errorMessage: null, screen: 'provider-setup' });
  }

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
      setSessionState({ isSubmittingQuestion: true, errorMessage: null });

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
        setSessionState({ errorMessage: response.error });
        return;
      }

      setSessionState({
        activeConversation: response.conversation,
        conversationMessages: response.messages,
        conversationHistory: await listConversationSummaries(),
        questionInput: '',
      });
    } catch (error) {
      setSessionState({
        errorMessage:
          error instanceof Error
            ? error.message
            : 'The grounded chat request failed unexpectedly.',
      });
    } finally {
      setSessionState({ isSubmittingQuestion: false });
    }
  }

  function handleQuestionInputKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
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

  function handleOpenHistoryPanel() {
    setSessionState({ readyPanel: 'history' });
  }

  function handleReturnToChatPanel() {
    setSessionState({ readyPanel: 'chat' });
  }

  return {
    activeConversation,
    activeHostname,
    activeSnapshot,
    apiKeyInput,
    availableModels,
    conversationHistory,
    conversationMessages,
    errorMessage,
    hasMoreModels,
    isLoadingOpenRouterModels,
    isRefreshingContext,
    isSaving,
    isSubmittingQuestion,
    isUsingLiveSnapshot,
    latestSnapshot,
    modelSearchQuery,
    openRouterModelError,
    questionInput,
    readyPanel,
    screen,
    selectedModelDefinition,
    selectedModelFromAvailableList,
    selectedModelId,
    selectedProvider,
    selectedProviderDefinition,
    setApiKeyInput: (apiKeyInput: string) => setSessionState({ apiKeyInput }),
    setModelSearchQuery: (modelSearchQuery: string) =>
      setSessionState({ modelSearchQuery }),
    setQuestionInput: (questionInput: string) =>
      setSessionState({ questionInput }),
    setSelectedModelId: (selectedModelId: string) =>
      setSessionState({ selectedModelId }),
    setShowFreeOpenRouterModelsOnly: (
      updater: boolean | ((currentValue: boolean) => boolean),
    ) =>
      setSessionState({
        showFreeOpenRouterModelsOnly:
          typeof updater === 'function'
            ? updater(showFreeOpenRouterModelsOnly)
            : updater,
      }),
    setVisibleModelCount: (
      updater: number | ((currentValue: number) => number),
    ) =>
      setSessionState({
        visibleModelCount:
          typeof updater === 'function' ? updater(visibleModelCount) : updater,
      }),
    showFreeOpenRouterModelsOnly,
    visibleModels,
    handleAskQuestion,
    handleBackToProviderSetup,
    handleBackToProviders,
    handleContinueFromWelcome,
    handleContinueToModelSelection,
    handleOpenConversation,
    handleOpenHistoryPanel,
    handleOpenProviderSettings,
    handleQuestionInputKeyDown,
    handleRefreshContext,
    handleReturnToChatPanel,
    handleSaveProviderConfiguration,
  };
}
