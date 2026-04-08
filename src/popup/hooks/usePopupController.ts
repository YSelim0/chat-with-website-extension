import { type KeyboardEvent, useEffect, useMemo, useState } from 'react';

import { getActiveTabHostname } from '../../lib/browser/active-tab';
import {
  getDefaultModelForProvider,
  getProviderDefinition,
  type ModelDefinition,
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
  type ExtensionSettings,
  getExtensionSettings,
  getSavedApiKey,
  saveProviderConfiguration,
} from '../../lib/storage/settings';
import type {
  AskQuestionResponse,
  Conversation,
  ConversationMessage,
  ConversationSummary,
} from '../../types/chat';
import type {
  ExtractActivePageResponse,
  SnapshotSummary,
} from '../../types/page-context';
import type { ListOpenRouterModelsResponse } from '../../types/provider-models';
import type { SupportedProvider } from '../../types/runtime';
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
  const [screen, setScreen] = useState<PopupScreen>('loading');
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<SupportedProvider>('openrouter');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [activeHostname, setActiveHostname] = useState<string | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<SnapshotSummary | null>(
    null,
  );
  const [activeSnapshot, setActiveSnapshot] = useState<SnapshotSummary | null>(
    null,
  );
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [readyPanel, setReadyPanel] = useState<ReadyPanel>('chat');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingContext, setIsRefreshingContext] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [openRouterModels, setOpenRouterModels] = useState<ModelDefinition[]>(
    [],
  );
  const [isLoadingOpenRouterModels, setIsLoadingOpenRouterModels] =
    useState(false);
  const [openRouterModelError, setOpenRouterModelError] = useState<
    string | null
  >(null);
  const [showFreeOpenRouterModelsOnly, setShowFreeOpenRouterModelsOnly] =
    useState(true);
  const [visibleModelCount, setVisibleModelCount] = useState(MODEL_PAGE_SIZE);
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[]
  >([]);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationSummary[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        setSettings(storedSettings);
        setSelectedProvider(initialProvider);
        setSelectedModelId(
          getInitialSelectedModel(storedSettings, initialProvider),
        );
        setApiKeyInput(getSavedApiKey(storedSettings, initialProvider));
        setActiveHostname(hostname);

        const history = await listConversationSummaries();
        setConversationHistory(history);

        if (hostname) {
          const latestSnapshotForHostname =
            await getLatestSnapshotForHostname(hostname);

          setLatestSnapshot(latestSnapshotForHostname);
          setActiveSnapshot(latestSnapshotForHostname);

          if (latestSnapshotForHostname) {
            const existingConversation = await getConversationBySnapshotId(
              latestSnapshotForHostname.id,
            );

            setActiveConversation(existingConversation?.conversation ?? null);
            setConversationMessages(existingConversation?.messages ?? []);
          }
        }

        setScreen(storedSettings.hasCompletedOnboarding ? 'ready' : 'welcome');
      } catch (error) {
        console.error('Failed to initialize popup state.', error);

        if (!isMounted) {
          return;
        }

        setErrorMessage(
          'Failed to load extension settings. Please reopen the popup.',
        );
        setScreen('welcome');
      }
    }

    loadPopupState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (screen !== 'model-selection' || selectedProvider !== 'openrouter') {
      return;
    }

    let isMounted = true;

    async function loadOpenRouterModels() {
      try {
        setIsLoadingOpenRouterModels(true);
        setOpenRouterModelError(null);

        const response = (await chrome.runtime.sendMessage({
          type: 'openrouter:list-models',
        })) as ListOpenRouterModelsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setOpenRouterModelError(response.error);
          setOpenRouterModels([]);
          return;
        }

        setOpenRouterModels(response.models);

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
          setSelectedModelId(preferredModel.id);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setOpenRouterModelError(
          error instanceof Error
            ? error.message
            : 'Failed to load the OpenRouter model list.',
        );
        setOpenRouterModels([]);
      } finally {
        if (isMounted) {
          setIsLoadingOpenRouterModels(false);
        }
      }
    }

    void loadOpenRouterModels();

    return () => {
      isMounted = false;
    };
  }, [screen, selectedModelId, selectedProvider]);

  function handleContinueFromWelcome() {
    setScreen('provider-setup');
  }

  function handleBackToProviders() {
    setErrorMessage(null);
    setScreen('welcome');
  }

  function handleContinueToModelSelection() {
    const trimmedApiKey = apiKeyInput.trim();

    if (!trimmedApiKey) {
      setErrorMessage('Enter an API key before continuing.');
      return;
    }

    setErrorMessage(null);
    setScreen('model-selection');
  }

  function handleBackToProviderSetup() {
    setErrorMessage(null);
    setScreen('provider-setup');
  }

  async function runActivePageExtraction() {
    const startedAt = Date.now();

    setScreen('scanning');
    setErrorMessage(null);

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
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Scanning failed before the page context was returned.',
      );
      setScreen('ready');
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

      setErrorMessage(response.error);
      setScreen('ready');
      return;
    }

    const remainingDelay =
      MINIMUM_SCANNING_DURATION_MS - (Date.now() - startedAt);

    if (remainingDelay > 0) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, remainingDelay);
      });
    }

    setLatestSnapshot(response.snapshot);
    setActiveSnapshot(response.snapshot);
    setActiveConversation(null);
    setConversationMessages([]);
    setReadyPanel('chat');
    setScreen('ready');
  }

  async function handleSaveProviderConfiguration() {
    const trimmedApiKey = apiKeyInput.trim();

    if (!trimmedApiKey) {
      setScreen('provider-setup');
      setErrorMessage('Enter an API key before continuing.');
      return;
    }

    if (!selectedModelId) {
      setErrorMessage('Choose a default model before continuing.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const nextSettings = await saveProviderConfiguration(
        selectedProvider,
        trimmedApiKey,
        selectedModelId,
      );

      setSettings(nextSettings);
      await runActivePageExtraction();
    } catch (error) {
      console.error('Failed to save provider configuration.', error);
      setErrorMessage('Failed to save the provider configuration locally.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenProviderSettings() {
    setApiKeyInput(settings ? getSavedApiKey(settings, selectedProvider) : '');
    setSelectedModelId(
      settings
        ? getInitialSelectedModel(settings, selectedProvider)
        : (getDefaultModelForProvider(selectedProvider)?.id ?? ''),
    );
    setModelSearchQuery('');
    setVisibleModelCount(MODEL_PAGE_SIZE);
    setConversationMessages([]);
    setActiveConversation(null);
    setErrorMessage(null);
    setScreen('provider-setup');
  }

  async function handleRefreshContext() {
    try {
      setIsRefreshingContext(true);
      await runActivePageExtraction();
    } finally {
      setIsRefreshingContext(false);
    }
  }

  async function handleAskQuestion() {
    const trimmedQuestion = questionInput.trim();

    if (!trimmedQuestion) {
      setErrorMessage('Enter a question before sending it.');
      return;
    }

    if (!activeSnapshot) {
      setErrorMessage(
        'Scan the page context before asking a grounded question.',
      );
      return;
    }

    try {
      setIsSubmittingQuestion(true);
      setErrorMessage(null);

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
        setErrorMessage(response.error);
        return;
      }

      setActiveConversation(response.conversation);
      setConversationMessages(response.messages);
      setConversationHistory(await listConversationSummaries());
      setQuestionInput('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The grounded chat request failed unexpectedly.',
      );
    } finally {
      setIsSubmittingQuestion(false);
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
      setErrorMessage('The selected conversation could not be loaded.');
      return;
    }

    const snapshotSummary = await getPageSnapshotSummaryById(
      conversation.conversation.snapshotId,
    );

    if (!snapshotSummary) {
      setErrorMessage(
        'The selected conversation snapshot could not be loaded.',
      );
      return;
    }

    setActiveConversation(conversation.conversation);
    setActiveSnapshot(snapshotSummary);
    setConversationMessages(conversation.messages);
    setReadyPanel('chat');
    setErrorMessage(null);
  }

  function handleOpenHistoryPanel() {
    setReadyPanel('history');
  }

  function handleReturnToChatPanel() {
    setReadyPanel('chat');
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
    setApiKeyInput,
    setModelSearchQuery,
    setQuestionInput,
    setSelectedModelId,
    setShowFreeOpenRouterModelsOnly,
    setVisibleModelCount,
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
