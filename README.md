# Chat With Website Extension

OpenRouter-first Chrome extension that scans the active website, saves a local page snapshot, and answers questions only from that snapshot context.

Current beta version: `0.1.0-beta.1`

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

## Contributing

Contributions are welcome. If you want to improve the extension, keep changes focused, document the reasoning behind the change, and include the validation steps you ran locally.

Typical contribution flow:

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a branch for your change
4. Run the local checks before opening a pull request
5. Open a pull request with a concise summary and testing notes

Clone with HTTPS:

```bash
git clone https://github.com/YSelim0/chat-with-website-extension.git
```

Or clone with SSH:

```bash
git clone git@github.com:YSelim0/chat-with-website-extension.git
```

Before opening a pull request, run:

```bash
npm run check
npm test
npm run build
```

Repository URL:

```text
https://github.com/YSelim0/chat-with-website-extension
```

## Related Docs

- `docs/PRODUCT_OVERVIEW.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/PRIVACY_AND_STORAGE.md`
- `docs/PRIVACY_POLICY.md`
- `docs/RELEASE_SUMMARY.md`
- `docs/ui-design.pen`
