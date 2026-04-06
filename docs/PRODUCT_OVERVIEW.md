# Website Chat Extension

## Purpose

Website Chat Extension is a browser extension that lets users ask questions about the currently open website using an AI provider of their choice. The extension reads the page content, builds a page-specific context, and answers only from that context instead of relying on the model's general knowledge.

## Core Product Goals

- Let users chat with the current website directly from the browser extension UI.
- Support multiple providers from the beginning: OpenAI, Google Gemini, Anthropic Claude, Groq, and OpenRouter.
- Keep provider credentials on the user side and persist them locally so setup is required only once.
- Preserve conversation history with clear website-level grouping.
- Make old conversations understandable by linking them to the page snapshot used when the answers were generated.
- Build the extension on Manifest V3 with a maintainable TypeScript codebase.

## User Experience Goals

- First launch opens an onboarding flow instead of an empty chat.
- Users select a provider, enter an API key, and confirm their setup in a few steps.
- Provider selection and model selection should be treated separately, because one provider key can expose multiple models.
- After setup, the extension shows a short scanning state while building the first page context.
- After setup, the extension opens directly into chat for future sessions.
- The extension clearly shows which site the active conversation belongs to.
- The history view shows previous conversations, their site, and when they were created.
- If context is unavailable or outdated, the UI makes that state visible to the user.

## Product Principles

- Context-first answers: responses must be based on extracted website content.
- No silent hallucination: if the answer is not in the page context, the assistant should say so.
- User-controlled storage: credentials and local conversation data stay on the user's device.
- Progressive architecture: start with a strong MVP, then extend safely.
- Small, feature-based commits: each phase should be shippable and reviewable on its own.

## MVP Scope

The first usable version should include:

- Browser action popup UI
- Onboarding flow with provider selection
- API key storage in local extension storage
- Default model selection per provider
- A transient scanning screen for active page context preparation
- Active tab page content extraction
- Page snapshot creation for conversations
- Chat screen using page-context retrieval
- Conversation history with website association
- Provider adapters for OpenAI, Gemini, Claude, Groq, and OpenRouter

## Important Product Decisions

### Context Model

Each conversation should be tied to a page snapshot captured at the time the conversation starts. This allows the extension to:

- reopen old conversations with the original context intact
- explain which website content the conversation was based on
- distinguish between archived context and a fresh scan of the live page

### History Model

History should not be treated as chat text only. Each conversation should store:

- website URL
- website title
- snapshot timestamp
- extracted content metadata
- user and assistant messages
- selected provider and model metadata

### Storage Model

- Provider settings, API keys, and default model selection: `chrome.storage.local`
- Conversation history and page snapshots: `IndexedDB`

This gives a practical MVP with user-side persistence while leaving room for optional encryption in a later phase.

### Provider and Model Model

Providers and models should be stored separately.

- A provider holds the saved API key and provider-level preferences.
- A model is selected under a provider, because a single provider key can expose multiple models.
- Each provider should have a default model for new conversations.
- Each conversation should persist the exact provider and model used for that chat.

This is especially important for OpenRouter and OpenAI, where one account can expose many different models.

### UI Flow Model

The popup should follow a clear state-driven flow:

- first-run welcome
- provider selection
- model selection for the chosen provider
- one-time API key setup
- transient scanning state while preparing page context
- main chat view
- history view with archived snapshot labeling

The scanning state is not part of permanent setup. It should appear only while the extension is extracting and preparing website context.

## Security and Privacy Direction

- Follow Manifest V3 requirements from the start.
- Request the minimum set of permissions needed.
- Keep all credentials in local extension-managed storage.
- Avoid injecting unnecessary scripts or broad host permissions.
- Restrict AI prompts to page-derived context as much as possible.

## Future Plans

- Optional side panel experience for longer sessions
- Optional encrypted API key storage with a user passphrase
- Better page retrieval and ranking strategies
- Source citations for each answer
- Streaming responses
- Model configuration per provider
- Sync and export of chat history
- Cross-browser packaging and publishing pipeline

## Non-Goals for the First Iteration

- Full cloud sync
- Advanced semantic embeddings pipeline
- Multi-device conversation continuity
- Complex team or shared workspace features
- Store publishing assets and submission workflow
