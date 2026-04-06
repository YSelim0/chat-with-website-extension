export function PopupApp() {
  return (
    <main className="popup-shell">
      <header className="popup-header">
        <p className="eyebrow">Phase 1 Bootstrap</p>
        <h1>Chat With Website</h1>
        <p className="subtitle">
          The extension shell is ready. Onboarding, provider setup, and grounded
          chat will be added in the next phases.
        </p>
      </header>

      <section className="card">
        <h2>Planned Providers</h2>
        <ul className="provider-list">
          <li>OpenAI</li>
          <li>Google Gemini</li>
          <li>Anthropic Claude</li>
          <li>Groq</li>
          <li>OpenRouter</li>
        </ul>
      </section>
    </main>
  );
}
