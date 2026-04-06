import { useEffect, useMemo, useState } from 'react';

import { getActiveTabHostname } from '../lib/browser/active-tab';
import { getProviderDefinition, PROVIDERS } from '../lib/providers/catalog';
import {
  type ExtensionSettings,
  getExtensionSettings,
  getSavedApiKey,
  saveProviderConfiguration,
} from '../lib/storage/settings';
import type { SupportedProvider } from '../types/runtime';

type PopupScreen =
  | 'loading'
  | 'welcome'
  | 'provider-selection'
  | 'provider-setup'
  | 'scanning'
  | 'ready';

function getInitialSelectedProvider(
  settings: ExtensionSettings,
): SupportedProvider {
  return settings.selectedProvider ?? 'openrouter';
}

export function PopupApp() {
  const [screen, setScreen] = useState<PopupScreen>('loading');
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<SupportedProvider>('openrouter');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [activeHostname, setActiveHostname] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProviderDefinition = useMemo(() => {
    return getProviderDefinition(selectedProvider);
  }, [selectedProvider]);

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

    setSelectedProvider(provider);
    setApiKeyInput(savedApiKey);
    setErrorMessage(null);
    setScreen('provider-setup');
  }

  function handleBackToProviders() {
    setErrorMessage(null);
    setScreen('provider-selection');
  }

  async function handleSaveProviderConfiguration() {
    const trimmedApiKey = apiKeyInput.trim();

    if (!trimmedApiKey) {
      setErrorMessage('Enter an API key before continuing.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const nextSettings = await saveProviderConfiguration(
        selectedProvider,
        trimmedApiKey,
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
          isSaving={isSaving}
          providerLabel={selectedProviderDefinition.label}
          providerPlaceholder={selectedProviderDefinition.keyPlaceholder}
          providerHint={selectedProviderDefinition.keyHint}
          onApiKeyInputChange={setApiKeyInput}
          onBack={handleBackToProviders}
          onSave={handleSaveProviderConfiguration}
        />
      ) : null}

      {screen === 'scanning' ? (
        <ScanningScreen activeHostname={activeHostname} />
      ) : null}

      {screen === 'ready' && selectedProviderDefinition ? (
        <ConfiguredScreen
          activeHostname={activeHostname}
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
          <li>Scan the current page</li>
          <li>Open the grounded chat view</li>
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
  isSaving,
  providerLabel,
  providerPlaceholder,
  providerHint,
  onApiKeyInputChange,
  onBack,
  onSave,
}: {
  apiKeyInput: string;
  errorMessage: string | null;
  isSaving: boolean;
  providerLabel: string;
  providerPlaceholder: string;
  providerHint: string;
  onApiKeyInputChange: (nextValue: string) => void;
  onBack: () => void;
  onSave: () => void;
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
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Save and Continue'}
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
  providerLabel,
  onOpenProviderSettings,
}: {
  activeHostname: string | null;
  providerLabel: string;
  onOpenProviderSettings: () => void;
}) {
  return (
    <section className="screen-panel screen-panel--chat">
      <header className="screen-header screen-header--chat">
        <div>
          <h1>Chat on {activeHostname ?? 'this website'}</h1>
          <p className="subtitle">
            Provider configured: {providerLabel}. Grounded page extraction and
            live chat will land in the next implementation phase.
          </p>
        </div>

        <div className="status-pill">Setup complete</div>
      </header>

      <section className="chat-card">
        <p className="chat-card__eyebrow">Assistant</p>
        <p className="chat-card__body">
          The provider is configured locally. The next phase will wire the popup
          to active page extraction and snapshot-based chat.
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
            Edit provider
          </button>
        </div>
      </section>
    </section>
  );
}
