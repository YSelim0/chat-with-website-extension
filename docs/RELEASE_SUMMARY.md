# Release Summary

## Version

`0.1.0-beta.1`

## What This Beta Includes

- OpenRouter-first onboarding flow
- local OpenRouter API key storage
- dynamic OpenRouter model picker with `Free only` filtering
- active page scanning and local snapshot storage
- grounded chat that answers from the scanned page context
- conversation history with reopen support
- archived versus live snapshot labeling

## Supported Usage

- regular `http` and `https` websites
- OpenRouter accounts with user-provided API keys
- page-by-page grounded question answering

## Known Beta Limitations

- browser-internal pages such as `chrome://` are not supported
- some free OpenRouter models may be temporarily rate-limited upstream
- API keys are stored locally without optional encryption in this beta
- side panel, streaming responses, and source citations are not included yet

## Recommended Positioning

This beta is intended for early users who want to chat with public websites using their own OpenRouter account and who can provide feedback on model quality, scanning reliability, and history behavior.

## Main Docs

- `README.md`
- `docs/PRODUCT_OVERVIEW.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/PRIVACY_AND_STORAGE.md`
- `docs/PRIVACY_POLICY.md`
