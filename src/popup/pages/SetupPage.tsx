export function SetupPage({
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
        <h1>Connect OpenRouter</h1>
        <p className="subtitle">
          This screen appears only once during initial setup. After saving your
          OpenRouter key locally, later launches open directly into chat.
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
          Your OpenRouter key lives in local extension storage on the
          user&apos;s device. A future settings screen can update or replace it.
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
