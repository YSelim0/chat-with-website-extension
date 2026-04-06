import { type KeyboardEvent, useEffect, useMemo, useState } from 'react';

import { getActiveTabHostname } from '../lib/browser/active-tab';
import {
  getDefaultModelForProvider,
  getProviderDefinition,
  type ModelDefinition,
  PROVIDERS,
} from '../lib/providers/catalog';
import { getLatestSnapshotForHostname } from '../lib/storage/page-snapshots';
import {
  type ExtensionSettings,
  getExtensionSettings,
  getSavedApiKey,
  getSavedModelId,
  saveProviderConfiguration,
} from '../lib/storage/settings';
import type { AskQuestionResponse, ConversationMessage } from '../types/chat';
import type {
  ExtractActivePageResponse,
  SnapshotSummary,
} from '../types/page-context';
import type { ListOpenRouterModelsResponse } from '../types/provider-models';
import type { SupportedProvider } from '../types/runtime';

type PopupScreen =
  | 'loading'
  | 'welcome'
  | 'provider-selection'
  | 'provider-setup'
  | 'model-selection'
  | 'scanning'
  | 'ready';

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

        if (hostname) {
          setLatestSnapshot(await getLatestSnapshotForHostname(hostname));
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
    setScreen('provider-selection');
  }

  function handleChooseProvider(provider: SupportedProvider) {
    const savedApiKey = settings ? getSavedApiKey(settings, provider) : '';
    const savedModelId = settings ? getSavedModelId(settings, provider) : null;
    const fallbackModel = getDefaultModelForProvider(provider)?.id ?? '';

    setSelectedProvider(provider);
    setSelectedModelId(savedModelId ?? fallbackModel);
    setApiKeyInput(savedApiKey);
    setModelSearchQuery('');
    setVisibleModelCount(MODEL_PAGE_SIZE);
    setConversationMessages([]);
    setErrorMessage(null);
    setScreen('provider-setup');
  }

  function handleBackToProviders() {
    setErrorMessage(null);
    setScreen('provider-selection');
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

    if (!latestSnapshot) {
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
          snapshotId: latestSnapshot.id,
        },
        type: 'chat:ask-question',
      })) as AskQuestionResponse;

      if (!response.ok) {
        setErrorMessage(response.error);
        return;
      }

      setConversationMessages(response.messages);
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

  if (screen === 'loading') {
    return (
      <main className="popup-shell popup-shell--centered">
        <div className="status-card">
          <p className="eyebrow">Loading</p>
          <h1>Preparing popup state</h1>
          <p className="subtitle">
            Reading local settings and current tab details.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="popup-shell">
      {screen === 'welcome' ? (
        <WelcomeScreen onContinue={handleContinueFromWelcome} />
      ) : null}

      {screen === 'provider-selection' ? (
        <ProviderSelectionScreen
          selectedProvider={selectedProvider}
          onChooseProvider={handleChooseProvider}
        />
      ) : null}

      {screen === 'provider-setup' && selectedProviderDefinition ? (
        <ProviderSetupScreen
          apiKeyInput={apiKeyInput}
          errorMessage={errorMessage}
          providerLabel={selectedProviderDefinition.label}
          providerPlaceholder={selectedProviderDefinition.keyPlaceholder}
          providerHint={selectedProviderDefinition.keyHint}
          onApiKeyInputChange={setApiKeyInput}
          onBack={handleBackToProviders}
          onContinue={handleContinueToModelSelection}
        />
      ) : null}

      {screen === 'model-selection' && selectedProviderDefinition ? (
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
      ) : null}

      {screen === 'scanning' ? (
        <ScanningScreen activeHostname={activeHostname} />
      ) : null}

      {screen === 'ready' && selectedProviderDefinition ? (
        <ConfiguredScreen
          activeHostname={activeHostname}
          conversationMessages={conversationMessages}
          errorMessage={errorMessage}
          isRefreshingContext={isRefreshingContext}
          isSubmittingQuestion={isSubmittingQuestion}
          latestSnapshot={latestSnapshot}
          modelLabel={selectedModelDefinition?.label ?? 'No model selected'}
          providerLabel={selectedProviderDefinition.label}
          providerSupportsChat={selectedProvider === 'openrouter'}
          questionInput={questionInput}
          setQuestionInput={setQuestionInput}
          onQuestionInputKeyDown={handleQuestionInputKeyDown}
          onAskQuestion={handleAskQuestion}
          onRefreshContext={handleRefreshContext}
          onOpenProviderSettings={handleOpenProviderSettings}
        />
      ) : null}
    </main>
  );
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="screen-panel">
      <div className="hero-badge">Website Chat Extension</div>

      <header className="screen-header">
        <h1>Chat with the current website.</h1>
        <p className="subtitle">
          Scan the active page, build a page-specific context, and answer only
          from that context.
        </p>
      </header>

      <section className="card card--accent">
        <h2>First launch flow</h2>
        <ol className="step-list">
          <li>Choose a provider</li>
          <li>Save your API key locally</li>
          <li>Choose the default model</li>
          <li>Scan the current page</li>
        </ol>
      </section>

      <div className="screen-footer">
        <button
          className="button button--primary"
          onClick={onContinue}
          type="button"
        >
          Get Started
        </button>

        <p className="helper-text">
          Provider setup is required only once per browser profile.
        </p>
      </div>
    </section>
  );
}

function ProviderSelectionScreen({
  selectedProvider,
  onChooseProvider,
}: {
  selectedProvider: SupportedProvider;
  onChooseProvider: (provider: SupportedProvider) => void;
}) {
  return (
    <section className="screen-panel">
      <header className="screen-header">
        <h1>Choose your AI provider</h1>
        <p className="subtitle">
          Each provider uses a local API key saved in the extension. OpenRouter
          is included for multi-model access.
        </p>
      </header>

      <div className="provider-grid">
        {PROVIDERS.map((provider) => {
          const isSelected = provider.id === selectedProvider;

          return (
            <button
              className={`provider-card${isSelected ? ' provider-card--selected' : ''}`}
              key={provider.id}
              onClick={() => onChooseProvider(provider.id)}
              type="button"
            >
              <span className="provider-card__title">{provider.label}</span>
              <span className="provider-card__description">
                {provider.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProviderSetupScreen({
  apiKeyInput,
  errorMessage,
  providerHint,
  providerLabel,
  providerPlaceholder,
  onApiKeyInputChange,
  onBack,
  onContinue,
}: {
  apiKeyInput: string;
  errorMessage: string | null;
  providerHint: string;
  providerLabel: string;
  providerPlaceholder: string;
  onApiKeyInputChange: (nextValue: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="screen-panel">
      <header className="screen-header">
        <h1>Connect your provider</h1>
        <p className="subtitle">
          This screen appears only once during initial setup. After saving the
          key locally, later launches open directly into the configured state.
        </p>
      </header>

      <section className="card card--accent">
        <label className="field-label" htmlFor="provider-api-key">
          {providerLabel} API Key
        </label>

        <input
          autoComplete="off"
          className="text-input"
          id="provider-api-key"
          onChange={(event) => onApiKeyInputChange(event.target.value)}
          placeholder={providerPlaceholder}
          spellCheck={false}
          type="password"
          value={apiKeyInput}
        />

        <p className="helper-text helper-text--tight">{providerHint}</p>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>

      <section className="card card--accent-soft">
        <h2>Saved once, reused later</h2>
        <p className="helper-text helper-text--body">
          Provider keys live in local extension storage on the user&apos;s
          device. A future settings screen can update or replace them.
        </p>
      </section>

      <div className="button-row">
        <button className="button button--ghost" onClick={onBack} type="button">
          Back
        </button>
        <button
          className="button button--primary"
          onClick={onContinue}
          type="button"
        >
          Continue
        </button>
      </div>
    </section>
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
          One {providerLabel} key can expose multiple models. Pick the default
          model for new conversations, then change it later from settings.
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

function ScanningScreen({ activeHostname }: { activeHostname: string | null }) {
  return (
    <section className="screen-panel">
      <header className="screen-header">
        <h1>Scanning the active page</h1>
        <p className="subtitle">
          This is a short-lived loading state shown after setup or when the user
          refreshes context from chat.
        </p>
      </header>

      <section className="card card--accent">
        <h2>{activeHostname ?? 'Current tab'}</h2>
        <p className="helper-text helper-text--body">
          Collecting readable content, section headings, and chunk metadata for
          retrieval.
        </p>

        <div aria-hidden="true" className="progress-track">
          <div className="progress-fill" />
        </div>
      </section>

      <section className="card card--accent-soft">
        <h2>Progress</h2>
        <p className="helper-text helper-text--body">
          Step 1 of 2. Next, the popup will open into the configured shell while
          the extracted page snapshot becomes available for the next chat phase.
        </p>
      </section>
    </section>
  );
}

function ConfiguredScreen({
  activeHostname,
  conversationMessages,
  errorMessage,
  isRefreshingContext,
  isSubmittingQuestion,
  latestSnapshot,
  modelLabel,
  providerLabel,
  providerSupportsChat,
  questionInput,
  setQuestionInput,
  onQuestionInputKeyDown,
  onAskQuestion,
  onRefreshContext,
  onOpenProviderSettings,
}: {
  activeHostname: string | null;
  conversationMessages: ConversationMessage[];
  errorMessage: string | null;
  isRefreshingContext: boolean;
  isSubmittingQuestion: boolean;
  latestSnapshot: SnapshotSummary | null;
  modelLabel: string;
  providerLabel: string;
  providerSupportsChat: boolean;
  questionInput: string;
  setQuestionInput: (nextValue: string) => void;
  onQuestionInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onAskQuestion: () => void;
  onRefreshContext: () => void;
  onOpenProviderSettings: () => void;
}) {
  return (
    <section className="screen-panel screen-panel--chat">
      <header className="screen-header screen-header--chat">
        <div>
          <h1>Chat on {activeHostname ?? 'this website'}</h1>
          <p className="subtitle">
            Provider configured: {providerLabel}. Default model: {modelLabel}.
          </p>
        </div>

        <div className="status-pill">Setup complete</div>
      </header>

      <section className="card card--accent-soft snapshot-card">
        <div className="snapshot-card__header">
          <h2>Latest page snapshot</h2>
          <button
            className="button button--secondary"
            disabled={isRefreshingContext}
            onClick={onRefreshContext}
            type="button"
          >
            {isRefreshingContext ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <h2>Latest page snapshot</h2>
        {latestSnapshot ? (
          <div className="snapshot-meta">
            <p className="helper-text helper-text--body">
              {latestSnapshot.title}
            </p>
            <p className="helper-text helper-text--tight">
              {latestSnapshot.chunkCount} chunks · {latestSnapshot.textLength}{' '}
              characters
            </p>
            <p className="helper-text helper-text--tight">
              Extracted at{' '}
              {new Date(latestSnapshot.extractedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="helper-text helper-text--body">
            No saved snapshot yet for {activeHostname ?? 'the current tab'}.
          </p>
        )}

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        {!providerSupportsChat ? (
          <p className="helper-text helper-text--body">
            Grounded chat requests are currently enabled only for OpenRouter in
            this build.
          </p>
        ) : null}
      </section>

      <section className="chat-card chat-card--scrollable">
        {conversationMessages.length === 0 ? (
          <>
            <p className="chat-card__eyebrow">Assistant</p>
            <p className="chat-card__body">
              Ask a question about the current page. Responses will use only the
              saved snapshot context.
            </p>
          </>
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
          </div>
        )}
      </section>

      <section className="composer-card">
        <textarea
          className="composer-input"
          disabled={!providerSupportsChat || !latestSnapshot}
          onChange={(event) => setQuestionInput(event.target.value)}
          onKeyDown={onQuestionInputKeyDown}
          placeholder="Ask about this page..."
          rows={4}
          value={questionInput}
        />
        <div className="composer-card__footer">
          <p className="helper-text helper-text--tight">
            Source-only answers will use the current page snapshot.
          </p>
          <div className="inline-actions">
            <button
              className="button button--secondary"
              onClick={onOpenProviderSettings}
              type="button"
            >
              Setup
            </button>
            <button
              className="button button--primary"
              disabled={
                isSubmittingQuestion || !providerSupportsChat || !latestSnapshot
              }
              onClick={onAskQuestion}
              type="button"
            >
              {isSubmittingQuestion ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
