export function WelcomePage({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="screen-panel">
      <div className="hero-badge">Website Chat Extension</div>

      <header className="screen-header">
        <h1>Chat with the current website using OpenRouter.</h1>
        <p className="subtitle">
          Scan the active page, build a page-specific context, and answer only
          from that context with your selected OpenRouter model.
        </p>
      </header>

      <section className="card card--accent">
        <h2>First launch flow</h2>
        <ol className="step-list">
          <li>Connect your OpenRouter API key</li>
          <li>Choose the default model</li>
          <li>Scan the current page</li>
          <li>Start a grounded chat</li>
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
          OpenRouter setup is required only once per browser profile.
        </p>
      </div>
    </section>
  );
}
