import { useEffect, useMemo, useState } from 'react';

import { getActiveTabHostname } from '../lib/browser/active-tab';
import {
  getDefaultModelForProvider,
  getProviderDefinition,
  type ModelDefinition,
  PROVIDERS,
} from '../lib/providers/catalog';
import {
  type ExtensionSettings,
  getExtensionSettings,
  getSavedApiKey,
  getSavedModelId,
  saveProviderConfiguration,
} from '../lib/storage/settings';
import type { SupportedProvider } from '../types/runtime';

type PopupScreen =
  | 'loading'
  | 'welcome'
  | 'provider-selection'
  | 'provider-setup'
  | 'model-selection'
  | 'scanning'
  | 'ready';

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
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProviderDefinition = useMemo(() => {
    return getProviderDefinition(selectedProvider);
  }, [selectedProvider]);

  const selectedModelDefinition = useMemo(() => {
    return selectedProviderDefinition?.models.find(
      (model) => model.id === selectedModelId,
    );
  }, [selectedModelId, selectedProviderDefinition]);

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
      setScreen('scanning');

      window.setTimeout(() => {
        setScreen('ready');
      }, 1200);
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
    setErrorMessage(null);
    setScreen('provider-setup');
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
          isSaving={isSaving}
          models={selectedProviderDefinition.models}
          providerLabel={selectedProviderDefinition.label}
          selectedModelId={selectedModelId}
          onBack={handleBackToProviderSetup}
          onChooseModel={setSelectedModelId}
          onSave={handleSaveProviderConfiguration}
        />
      ) : null}

      {screen === 'scanning' ? (
        <ScanningScreen activeHostname={activeHostname} />
      ) : null}

      {screen === 'ready' && selectedProviderDefinition ? (
        <ConfiguredScreen
          activeHostname={activeHostname}
          modelLabel={selectedModelDefinition?.label ?? 'No model selected'}
          providerLabel={selectedProviderDefinition.label}
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
  isSaving,
  models,
  providerLabel,
  selectedModelId,
  onBack,
  onChooseModel,
  onSave,
}: {
  errorMessage: string | null;
  isSaving: boolean;
  models: ModelDefinition[];
  providerLabel: string;
  selectedModelId: string;
  onBack: () => void;
  onChooseModel: (modelId: string) => void;
  onSave: () => void;
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

      <div className="provider-grid">
        {models.map((model) => {
          const isSelected = model.id === selectedModelId;

          return (
            <button
              className={`provider-card${isSelected ? ' provider-card--selected' : ''}`}
              key={model.id}
              onClick={() => onChooseModel(model.id)}
              type="button"
            >
              <span className="provider-card__title">{model.label}</span>
              <span className="provider-card__description">
                {model.description}
              </span>
            </button>
          );
        })}
      </div>

      <section className="card card--accent-soft">
        <h2>Model list behavior</h2>
        <p className="helper-text helper-text--body">
          If the provider supports live model listing, the popup can fetch it
          later. Until then, a safe fallback model catalog keeps setup simple.
        </p>
      </section>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <div className="button-row">
        <button className="button button--ghost" onClick={onBack} type="button">
          Back
        </button>
        <button
          className="button button--primary"
          disabled={isSaving}
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
          grounded chat features are completed in the next phase.
        </p>
      </section>
    </section>
  );
}

function ConfiguredScreen({
  activeHostname,
  modelLabel,
  providerLabel,
  onOpenProviderSettings,
}: {
  activeHostname: string | null;
  modelLabel: string;
  providerLabel: string;
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

      <section className="chat-card">
        <p className="chat-card__eyebrow">Assistant</p>
        <p className="chat-card__body">
          The provider and default model are configured locally. The next phase
          will wire the popup to active page extraction and snapshot-based chat.
        </p>
      </section>

      <section className="composer-card">
        <p className="composer-card__placeholder">Ask about this page...</p>
        <div className="composer-card__footer">
          <p className="helper-text helper-text--tight">
            Source-only answers will use the current page snapshot.
          </p>
          <button
            className="button button--secondary"
            onClick={onOpenProviderSettings}
            type="button"
          >
            Edit setup
          </button>
        </div>
      </section>
    </section>
  );
}
