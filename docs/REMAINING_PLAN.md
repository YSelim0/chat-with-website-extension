# Remaining Plan

## Current State

The extension already has a working OpenRouter-first foundation with:

- first-run onboarding
- local API key storage
- dynamic model selection with free-model filtering
- page scanning and snapshot persistence
- grounded chat against saved page context
- conversation history with reopen support

## Remaining Product Direction

The next work should focus on making the extension feel like a polished single-provider product instead of a generic multi-provider shell.

## Sprint 1: OpenRouter-Only Cleanup

### Goal

Simplify the popup flow so the product clearly presents itself as an OpenRouter-based website chat tool.

### Deliverables

- remove provider selection from onboarding
- make setup copy explicitly OpenRouter-first
- keep OpenRouter model selection as the core setup step
- reduce generic provider wording across popup screens

### Commit Outcome

The onboarding flow should become:

1. Welcome
2. Connect OpenRouter
3. Choose model
4. Scan page
5. Chat and History

## Sprint 2: Hardening and Release Stability

### Goal

Improve reliability and user guidance for real-world usage.

### Deliverables

- better unsupported-page messaging
- clearer rate-limit and network error handling
- empty-state cleanup across chat and history
- popup interaction polish and accessibility fixes
- targeted permission and manifest review

### Commit Outcome

The extension should feel stable enough for broader manual testing.

## Sprint 3: Release Readiness

### Goal

Prepare the first production-facing build.

### Deliverables

- basic tests for storage, extraction, and conversation flows
- final documentation cleanup
- release checklist for manual QA
- final copy review

### Commit Outcome

The project should be ready for a release candidate pass.
