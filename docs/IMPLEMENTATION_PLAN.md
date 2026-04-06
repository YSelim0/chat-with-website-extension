# Implementation Plan

## Planning Rules

- Each phase must be independently completable in a single focused sprint.
- Later phases must build on earlier ones without partially depending on unfinished work.
- Each phase should end in a commit-ready state.
- The roadmap should favor vertical slices over scattered low-level tasks.

## Phase 1: Project Bootstrap

### Goal

Create the extension foundation so development can continue on a stable MV3, TypeScript, and React setup.

### Deliverables

- WXT-based project setup
- TypeScript configuration
- Base popup entry
- Background service worker entry
- Content script entry
- Shared source folder structure
- Lint/format/test configuration baseline
- Initial project documentation

### Commit Outcome

At the end of this phase, the repository should install, build, and load as a minimal Chrome extension shell.

## Phase 2: Onboarding, Provider Setup, and Model Selection

### Goal

Build the first-launch setup flow and allow users to configure one provider account locally together with a default model selection.

### Deliverables

- Onboarding UI in the popup
- Provider selection screen
- API key input and validation flow
- Model selection step for the chosen provider
- Local persistence of provider settings
- Local persistence of default model selection per provider
- Support list covering OpenAI, Gemini, Claude, Groq, and OpenRouter
- Setup completion state that skips onboarding on later launches
- A separate transient scanning state after setup completes

### Commit Outcome

At the end of this phase, users should be able to open the extension, complete setup once, choose a default model for the selected provider, and return directly to the configured state on the next launch.

## Phase 3: Website Context Extraction

### Goal

Extract usable text from the active website and prepare it for conversation grounding.

### Deliverables

- Active tab inspection flow
- Content script page extraction logic
- Main content parsing and cleanup
- Chunking strategy for extracted text
- Snapshot persistence for page context
- Context metadata model for URL, title, timestamps, and content hash
- Integration of the scanning state with first-run setup and manual context refresh

### Commit Outcome

At the end of this phase, the extension should be able to capture and store a structured snapshot of the current page for later chat use.

## Phase 4: Provider Abstraction and AI Messaging

### Goal

Create a provider-agnostic AI layer and send grounded chat requests using the stored page snapshot.

### Deliverables

- Shared provider interface
- Model listing support or fallback model catalogs per provider
- Provider-specific request adapters
- Background-side request orchestration
- Prompt assembly from retrieved page chunks
- Context-only answer policy and refusal fallback when information is missing
- Basic error handling for invalid keys, quota issues, and network failures

### Commit Outcome

At the end of this phase, the extension should be able to generate grounded answers from any supported provider using the captured website context.

## Phase 5: Chat Experience and History

### Goal

Ship the main user-facing chat experience with persistent, understandable history.

### Deliverables

- Chat UI with loading and error states
- Message list and input flow
- Conversation persistence
- History sidebar or history view in the popup
- Site-aware conversation records
- Reopen archived conversations using their stored page snapshot
- UI labeling for archived snapshot versus fresh live context

### Commit Outcome

At the end of this phase, users should be able to chat, close the extension, reopen it later, and continue reviewing or continuing prior conversations with clear context boundaries.

## Phase 6: Hardening and Release Readiness

### Goal

Stabilize the MVP, improve safety, and prepare the extension for broader usage.

### Deliverables

- Unit tests for storage, extraction, and provider logic
- Integration coverage for popup flows where practical
- Permission review and manifest cleanup
- Accessibility pass for popup UI
- Error logging improvements
- Empty, offline, and unsupported-page handling
- Final documentation updates

### Commit Outcome

At the end of this phase, the MVP should be stable, testable, and ready for manual QA and packaging.

## Suggested Commit Sequence

1. `docs: add product overview and implementation plan`
2. `chore: bootstrap wxt extension project`
3. `feat: add onboarding and provider configuration`
4. `feat: implement active page context extraction`
5. `feat: add multi-provider grounded chat pipeline`
6. `feat: add chat history with snapshot-based conversations`
7. `test: harden extension flows and documentation`

## Initial Dependency Plan

### Core

- `wxt`
- `react`
- `react-dom`
- `typescript`

### Data and Validation

- `dexie`
- `zod`
- `nanoid`

### Context Extraction and Retrieval

- `@mozilla/readability`
- `minisearch`

### UI Helpers

- `react-markdown`
- `remark-gfm`
- `date-fns`
- `lucide-react`
- `clsx`

### Tooling

- `vitest`
- `jsdom`
- `@testing-library/react`
- `@testing-library/user-event`
- `@biomejs/biome`

## Notes for Later Iterations

- Add optional side panel support after the popup MVP is stable.
- Consider optional encryption for locally stored API keys.
- Consider OpenAI-compatible adapter reuse for providers that support it.
- Add response streaming only after the baseline request lifecycle is stable.
