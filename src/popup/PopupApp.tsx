import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import editIconUrl from '../assets/icons/edit.svg';
import historyIconUrl from '../assets/icons/history.svg';
import refreshIconUrl from '../assets/icons/refresh.svg';
import sendIconUrl from '../assets/icons/send.svg';

import { getActiveTabHostname } from '../lib/browser/active-tab';
import {
  getDefaultModelForProvider,
  getProviderDefinition,
  type ModelDefinition,
} from '../lib/providers/catalog';
import {
  getConversationById,
  getConversationBySnapshotId,
  listConversationSummaries,
} from '../lib/storage/conversations';
import {
  getLatestSnapshotForHostname,
  getPageSnapshotSummaryById,
} from '../lib/storage/page-snapshots';
import {
  type ExtensionSettings,
  getExtensionSettings,
  getSavedApiKey,
  getSavedModelId,
  saveProviderConfiguration,
} from '../lib/storage/settings';
import type {
  AskQuestionResponse,
  Conversation,
  ConversationMessage,
  ConversationSummary,
} from '../types/chat';
import type {
  ExtractActivePageResponse,
  SnapshotSummary,
} from '../types/page-context';
import type { ListOpenRouterModelsResponse } from '../types/provider-models';
import type { SupportedProvider } from '../types/runtime';
import { PopupRouter } from './router/PopupRouter';

type PopupScreen =
  | 'loading'
  | 'welcome'
  | 'provider-setup'
  | 'model-selection'
  | 'scanning'
  | 'ready';

type ReadyPanel = 'chat' | 'history';

const POPUP_EXTRACTION_TIMEOUT_MS = 50000;
const MINIMUM_SCANNING_DURATION_MS = 900;
const MODEL_PAGE_SIZE = 20;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getInitialSelectedProvider(
  settings: ExtensionSettings,
): SupportedProvider {
  return settings.selectedProvider ?? 'openrouter';
}

function getInitialSelectedModel(
  settings: ExtensionSettings,
  provider: SupportedProvider,
) {
  return (
    getSavedModelId(settings, provider) ??
    getDefaultModelForProvider(provider)?.id ??
    ''
  );
}

function getSnapshotHelpText(
  errorMessage: string | null,
  activeHostname: string | null,
) {
  if (errorMessage?.includes('cannot be scanned')) {
    return 'Open a regular website tab, not a browser-internal page, then try scanning again.';
  }

  if (errorMessage?.includes('timed out')) {
    return 'Refresh the current tab or switch to a simpler page, then try scanning again.';
  }

  if (errorMessage?.includes('Could not reach OpenRouter')) {
    return 'Check your internet connection before retrying the request.';
  }

  if (errorMessage?.includes('rate-limited')) {
    return 'Try again shortly or open Setup to choose another free model.';
  }

  return `No saved snapshot yet for ${activeHostname ?? 'the current tab'}. Scan the page to start a grounded chat.`;
}

function getSnapshotAction(errorMessage: string | null) {
  if (errorMessage?.includes('rate-limited')) {
    return 'setup' as const;
  }

  if (
    errorMessage?.includes('cannot be scanned') ||
    errorMessage?.includes('timed out') ||
    errorMessage?.includes('Could not reach OpenRouter')
  ) {
    return 'refresh' as const;
  }

  return null;
}

export function PopupApp() {
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
    const normalizedQuery = modelSearchQuery.trim().toLowerCase();

    return availableModels.filter((model) => {
      if (
        selectedProvider === 'openrouter' &&
        showFreeOpenRouterModelsOnly &&
        !model.isFree
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [model.id, model.label, model.providerName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
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

  if (screen === 'loading') {
    return (
      <PopupRouter
        activeHostname={activeHostname}
        apiKeyInput={apiKeyInput}
        appChatElement={null}
        appHistoryElement={null}
        errorMessage={errorMessage}
        modelSelectionElement={null}
        providerHint=""
        providerLabel="OpenRouter"
        providerPlaceholder=""
        readyPanel={readyPanel}
        screen={screen}
        onApiKeyInputChange={setApiKeyInput}
        onBackFromSetup={handleBackToProviders}
        onContinueFromSetup={handleContinueToModelSelection}
        onContinueFromWelcome={handleContinueFromWelcome}
      />
    );
  }

  return (
    <PopupRouter
      activeHostname={activeHostname}
      apiKeyInput={apiKeyInput}
      appChatElement={
        selectedProviderDefinition ? (
          <ConfiguredScreen
            activeHostname={activeHostname}
            activeConversation={activeConversation}
            activeSnapshot={activeSnapshot}
            conversationHistory={conversationHistory}
            conversationMessages={conversationMessages}
            errorMessage={errorMessage}
            isRefreshingContext={isRefreshingContext}
            isSubmittingQuestion={isSubmittingQuestion}
            isUsingLiveSnapshot={isUsingLiveSnapshot}
            latestSnapshot={latestSnapshot}
            modelLabel={selectedModelDefinition?.label ?? 'No model selected'}
            questionInput={questionInput}
            readyPanel="chat"
            setQuestionInput={setQuestionInput}
            onOpenConversation={handleOpenConversation}
            onOpenHistoryPanel={handleOpenHistoryPanel}
            onQuestionInputKeyDown={handleQuestionInputKeyDown}
            onAskQuestion={handleAskQuestion}
            onRefreshContext={handleRefreshContext}
            onReturnToChatPanel={handleReturnToChatPanel}
            onOpenProviderSettings={handleOpenProviderSettings}
          />
        ) : null
      }
      appHistoryElement={
        selectedProviderDefinition ? (
          <ConfiguredScreen
            activeHostname={activeHostname}
            activeConversation={activeConversation}
            activeSnapshot={activeSnapshot}
            conversationHistory={conversationHistory}
            conversationMessages={conversationMessages}
            errorMessage={errorMessage}
            isRefreshingContext={isRefreshingContext}
            isSubmittingQuestion={isSubmittingQuestion}
            isUsingLiveSnapshot={isUsingLiveSnapshot}
            latestSnapshot={latestSnapshot}
            modelLabel={selectedModelDefinition?.label ?? 'No model selected'}
            questionInput={questionInput}
            readyPanel="history"
            setQuestionInput={setQuestionInput}
            onOpenConversation={handleOpenConversation}
            onOpenHistoryPanel={handleOpenHistoryPanel}
            onQuestionInputKeyDown={handleQuestionInputKeyDown}
            onAskQuestion={handleAskQuestion}
            onRefreshContext={handleRefreshContext}
            onReturnToChatPanel={handleReturnToChatPanel}
            onOpenProviderSettings={handleOpenProviderSettings}
          />
        ) : null
      }
      errorMessage={errorMessage}
      modelSelectionElement={
        selectedProviderDefinition ? (
          <ModelSelectionScreen
            errorMessage={errorMessage}
            hasMoreModels={hasMoreModels}
            isLoadingModels={isLoadingOpenRouterModels}
            isSaving={isSaving}
            modelListError={openRouterModelError}
            modelSearchQuery={modelSearchQuery}
            models={visibleModels}
            providerLabel={selectedProviderDefinition.label}
            providerSupportsDynamicModels={selectedProvider === 'openrouter'}
            selectedModel={selectedModelFromAvailableList}
            selectedModelId={selectedModelId}
            showFreeOnly={showFreeOpenRouterModelsOnly}
            onBack={handleBackToProviderSetup}
            onChooseModel={setSelectedModelId}
            onLoadMoreModels={() => {
              setVisibleModelCount(
                (currentValue) => currentValue + MODEL_PAGE_SIZE,
              );
            }}
            onModelSearchQueryChange={(nextValue) => {
              setModelSearchQuery(nextValue);
              setVisibleModelCount(MODEL_PAGE_SIZE);
            }}
            onSave={handleSaveProviderConfiguration}
            onToggleFreeOnly={() => {
              setShowFreeOpenRouterModelsOnly((currentValue) => !currentValue);
              setVisibleModelCount(MODEL_PAGE_SIZE);
            }}
          />
        ) : null
      }
      providerHint={selectedProviderDefinition?.keyHint ?? ''}
      providerLabel={selectedProviderDefinition?.label ?? 'OpenRouter'}
      providerPlaceholder={selectedProviderDefinition?.keyPlaceholder ?? ''}
      readyPanel={readyPanel}
      screen={screen}
      onApiKeyInputChange={setApiKeyInput}
      onBackFromSetup={handleBackToProviders}
      onContinueFromSetup={handleContinueToModelSelection}
      onContinueFromWelcome={handleContinueFromWelcome}
    />
  );
}

function ModelSelectionScreen({
  errorMessage,
  hasMoreModels,
  isLoadingModels,
  isSaving,
  modelListError,
  modelSearchQuery,
  models,
  providerLabel,
  providerSupportsDynamicModels,
  selectedModel,
  selectedModelId,
  showFreeOnly,
  onBack,
  onChooseModel,
  onLoadMoreModels,
  onModelSearchQueryChange,
  onSave,
  onToggleFreeOnly,
}: {
  errorMessage: string | null;
  hasMoreModels: boolean;
  isLoadingModels: boolean;
  isSaving: boolean;
  modelListError: string | null;
  modelSearchQuery: string;
  models: ModelDefinition[];
  providerLabel: string;
  providerSupportsDynamicModels: boolean;
  selectedModel: ModelDefinition | null;
  selectedModelId: string;
  showFreeOnly: boolean;
  onBack: () => void;
  onChooseModel: (modelId: string) => void;
  onLoadMoreModels: () => void;
  onModelSearchQueryChange: (nextValue: string) => void;
  onSave: () => void;
  onToggleFreeOnly: () => void;
}) {
  return (
    <section className="screen-panel">
      <header className="screen-header">
        <h1>Choose a default model</h1>
        <p className="subtitle">
          Your {providerLabel} account can expose many models. Pick the default
          one for new conversations, then change it later from settings.
        </p>
      </header>

      {providerSupportsDynamicModels ? (
        <section className="card card--accent-soft model-tools">
          <input
            className="text-input"
            onChange={(event) => onModelSearchQueryChange(event.target.value)}
            placeholder="Search OpenRouter models"
            type="text"
            value={modelSearchQuery}
          />

          <label className="toggle-row">
            <input
              checked={showFreeOnly}
              onChange={onToggleFreeOnly}
              type="checkbox"
            />
            <span className="helper-text helper-text--tight">Free only</span>
          </label>

          {isLoadingModels ? (
            <p className="helper-text helper-text--body">
              Loading OpenRouter models...
            </p>
          ) : null}

          {modelListError ? (
            <p className="helper-text helper-text--body">
              Could not load the live model list. Showing fallback models
              instead.
            </p>
          ) : null}
        </section>
      ) : null}

      {selectedModel ? (
        <section className="card card--accent selected-model-card">
          <div className="provider-card__row">
            <h2>Selected model</h2>
            {selectedModel.isFree ? (
              <span className="model-badge">Free</span>
            ) : null}
          </div>
          <p className="helper-text helper-text--body">{selectedModel.label}</p>
          {selectedModel.providerName ? (
            <p className="helper-text helper-text--tight">
              {selectedModel.providerName}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="provider-grid provider-grid--scrollable">
        {models.length === 0 ? (
          <section className="card card--accent-soft">
            <p className="helper-text helper-text--body">
              No models matched the current filters.
            </p>
          </section>
        ) : (
          models.map((model) => {
            const isSelected = model.id === selectedModelId;

            return (
              <button
                className={`provider-card${isSelected ? ' provider-card--selected' : ''}`}
                key={model.id}
                onClick={() => onChooseModel(model.id)}
                type="button"
              >
                <div className="provider-card__row">
                  <span className="provider-card__title">{model.label}</span>
                  {model.isFree ? (
                    <span className="model-badge">Free</span>
                  ) : null}
                </div>
                {model.providerName ? (
                  <span className="provider-card__meta">
                    {model.providerName}
                  </span>
                ) : null}
                <span className="provider-card__description">
                  {model.description}
                </span>
              </button>
            );
          })
        )}
      </div>

      {hasMoreModels ? (
        <button
          className="button button--ghost"
          onClick={onLoadMoreModels}
          type="button"
        >
          Load more models
        </button>
      ) : null}

      <section className="card card--accent-soft">
        <h2>Model list behavior</h2>
        <p className="helper-text helper-text--body">
          OpenRouter models are fetched dynamically in this screen. If loading
          fails, the setup falls back to a small built-in catalog.
        </p>
      </section>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <div className="button-row button-row--sticky">
        <button className="button button--ghost" onClick={onBack} type="button">
          Back
        </button>
        <button
          className="button button--primary"
          disabled={isSaving || !selectedModelId}
          onClick={onSave}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </section>
  );
}

function ConfiguredScreen({
  activeHostname,
  activeConversation,
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
  onOpenConversation,
  onOpenHistoryPanel,
  onQuestionInputKeyDown,
  onAskQuestion,
  onRefreshContext,
  onReturnToChatPanel,
  onOpenProviderSettings,
}: {
  activeHostname: string | null;
  activeConversation: Conversation | null;
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
  onOpenConversation: (conversationId: string) => void;
  onOpenHistoryPanel: () => void;
  onQuestionInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onAskQuestion: () => void;
  onRefreshContext: () => void;
  onReturnToChatPanel: () => void;
  onOpenProviderSettings: () => void;
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
        <section className="history-list history-list--scrollable">
          {conversationHistory.length === 0 ? (
            <section className="card card--accent-soft">
              <h2>No conversation history yet</h2>
              <p className="helper-text helper-text--body">
                Ask a grounded question and your conversation history will
                appear here.
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
      ) : (
        <>
          <section className="card card--accent-soft snapshot-card">
            <div className="snapshot-card__header">
              <div>
                <h2>Page snapshot</h2>
                <p className="helper-text helper-text--tight">
                  {isUsingLiveSnapshot
                    ? 'Live page context'
                    : 'Archived snapshot'}
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
                  {activeSnapshot.chunkCount} chunks ·{' '}
                  {activeSnapshot.textLength} characters
                </p>
                <p className="helper-text helper-text--tight">
                  Extracted at{' '}
                  {new Date(activeSnapshot.extractedAt).toLocaleString()}
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

          <section className="chat-card chat-card--scrollable">
            {conversationMessages.length === 0 ? (
              <div className="empty-state-block">
                <p className="chat-card__eyebrow">Assistant</p>
                <p className="chat-card__body">
                  Ask a question about the current page. Responses will use only
                  the saved snapshot context.
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
        </>
      )}
    </section>
  );
}
