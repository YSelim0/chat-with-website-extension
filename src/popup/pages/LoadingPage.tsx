export function LoadingPage() {
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
