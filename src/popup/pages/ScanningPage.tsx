export function ScanningPage({
  activeHostname,
}: {
  activeHostname: string | null;
}) {
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
