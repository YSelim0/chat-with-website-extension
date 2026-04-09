# Sprint Backlog

## Purpose

This document tracks the remaining product work after the `0.1.0-beta.1` release candidate. The goal is to move in small, commit-ready sprints instead of mixing unrelated changes together.

## Sprint 1: Chat UX Fixes

### Goal

Fix the chat scrolling behavior and improve message readability.

### Tasks

- Fix auto-scroll so the chat always moves to the latest message when a new assistant or user message is added
- Verify the scroll logic also works when reopening a previous conversation from history
- Make the assistant response renderer support Markdown output
- Keep user messages as plain text unless there is a clear reason to render them as Markdown
- Add popup styles for common Markdown elements such as paragraphs, lists, inline code, code blocks, blockquotes, and links

### Done When

- New messages always scroll into view reliably
- Assistant messages render Markdown cleanly without breaking the popup layout

## Sprint 2: Post-Beta UX Polish

### Goal

Polish the popup experience after the first beta.

### Tasks

- Review chat spacing and typography after Markdown rendering is added
- Improve any remaining empty, loading, or retry states discovered during beta feedback
- Recheck long responses, long hostnames, and multi-message histories for layout issues
- Recheck model selection usability after real usage feedback

### Done When

- The popup feels consistent and stable across setup, chat, and history flows

## Sprint 3: Release-Oriented Product Improvements

### Goal

Add the next small product improvements without expanding scope too widely.

### Candidate Tasks

- Add a clear "new chat" flow when switching to a fresh page snapshot
- Improve history discoverability or grouping if user feedback suggests it
- Improve rate-limit guidance when free models are unavailable
- Revisit any remaining popup architecture cleanup only if it directly helps shipping or maintenance

### Done When

- The next release includes a few targeted quality improvements driven by real usage

## Sprint 4: End-to-End Test Coverage

### Goal

Add end-to-end coverage after the main UX and product flow stabilize.

### Tasks

- Choose an E2E strategy suitable for extension workflows
- Cover the critical path:
  - onboarding
  - OpenRouter setup
  - model selection
  - scanning
  - grounded chat
  - history reopen
- Add at least one regression test for unsupported pages or scan failures
- Document how to run the E2E suite locally

### Done When

- The core popup flow has automated end-to-end protection and can be rerun before future releases
