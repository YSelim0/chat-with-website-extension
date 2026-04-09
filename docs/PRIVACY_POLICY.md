# Privacy Policy

## Overview

Chat With Website Extension lets users scan the current website, store a local page snapshot, and send grounded questions to OpenRouter using the user's own API key.

## Information We Store Locally

The extension stores the following data on the user's device:

- OpenRouter API key in `chrome.storage.local`
- selected default OpenRouter model in `chrome.storage.local`
- page snapshots in IndexedDB
- conversation history in IndexedDB

## Information Sent To Third Parties

When the user sends a question, the extension sends the following data to OpenRouter:

- the selected model ID
- the user's question
- the stored page snapshot content used as grounding context
- prior messages from the same conversation when continuing that conversation

The extension does not send this data to any other service operated by this project.

## Information We Do Not Currently Collect

This extension does not currently provide:

- cloud sync managed by this project
- remote storage of API keys managed by this project
- remote backup of conversation history managed by this project
- account creation for this extension

## User Responsibility

Users should avoid scanning or sending sensitive website content unless they are comfortable with that content being processed by OpenRouter.

Users are responsible for reviewing OpenRouter's own terms, data handling, and billing policies when using their API key.

## Data Removal

Users can remove locally stored extension data by clearing extension storage or uninstalling the extension.

## Contact And Future Changes

This policy may be updated in later versions as the extension gains new storage, export, sync, or account features.
