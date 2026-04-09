# Store Listing Draft

## Product Name

Chat With Website Extension

## Short Description

Chat with the current website using OpenRouter and answers grounded in the page content.

## Detailed Description

Chat With Website Extension helps you ask questions about the website you are currently viewing.

The extension scans the active page, creates a local page snapshot, and sends grounded questions to OpenRouter using your own API key. Responses are based on the scanned website context instead of general model knowledge whenever possible.

### Key Features

- OpenRouter-first setup flow
- Dynamic model picker with free-model filtering
- Local page scanning and snapshot creation
- Grounded chat based on the active website
- Conversation history with reopen support
- Archived versus live snapshot labeling

### How It Works

1. Open the extension on a public website
2. Enter your OpenRouter API key
3. Choose a model
4. Let the extension scan the page
5. Ask questions about the page content

### Notes

- Works on normal `http` and `https` pages
- Does not support browser-internal pages such as `chrome://`
- Some free models may be temporarily rate-limited upstream by OpenRouter providers

## Category Suggestions

- Productivity
- Developer Tools

## Privacy Policy URL

https://yavuzsen.com/policies/chat-with-website-extension-policy.html

## Permissions Rationale

- `storage`: saves the OpenRouter API key, selected model, and local extension settings
- `activeTab`: lets the extension work with the page the user is currently viewing
- `scripting`: supports page extraction and popup-driven scan behavior

## Local Data Storage Notes

- page snapshots are stored locally in IndexedDB
- conversation history is stored locally in IndexedDB

## Host Permissions Rationale

- `https://openrouter.ai/*`: required to fetch model lists and send grounded chat requests
