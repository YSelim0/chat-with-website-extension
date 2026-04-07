# Chat With Website Extension

OpenRouter-first Chrome extension that scans the active website, saves a local page snapshot, and answers questions only from that snapshot context.

## Current Scope

- OpenRouter-only onboarding flow
- Dynamic OpenRouter model picker with free-model filtering
- Active page scanning and local snapshot storage
- Grounded chat against saved page context
- Conversation history with archived versus live snapshot labels

## Stack

- WXT
- React
- TypeScript
- Manifest V3
- Dexie
- Vitest

## Install

```bash
npm install
```

## Development

```bash
npm run build
```

Optional checks:

```bash
npm run check
npm test
```

## Load In Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `.output/chrome-mv3`
5. Reload the active website tab after extension reloads if needed

## Manual Flow

1. Open the popup on a normal `http` or `https` page
2. Enter your OpenRouter API key
3. Choose a model
4. Wait for page scanning
5. Ask grounded questions about the current page
6. Reopen previous conversations from `History`

## Useful Commands

```bash
npm run build
npm run check
npm test
```

## Related Docs

- `docs/PRODUCT_OVERVIEW.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/REMAINING_PLAN.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/ui-design.pen`
