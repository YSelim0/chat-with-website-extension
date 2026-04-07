# Privacy And Storage

## Current Data Flow

The extension scans the active website, stores a local snapshot of the extracted page text, and sends grounded chat requests to OpenRouter using the user's saved API key.

## Stored Locally

The extension stores the following data on the user's device:

- OpenRouter API key in `chrome.storage.local`
- selected default model in `chrome.storage.local`
- saved page snapshots in IndexedDB
- saved conversation history in IndexedDB

## Sent To OpenRouter

When the user asks a question, the extension sends:

- the selected OpenRouter model ID
- the user's chat message
- the saved page snapshot content used as grounding context
- prior messages from the same conversation, when continuing that conversation

## Not Currently Implemented

The current build does not include:

- cloud sync of conversations
- remote backup of API keys
- user account storage outside OpenRouter
- optional local encryption for saved API keys

## User Expectations

- The user should assume grounded page content is sent to OpenRouter when asking a question.
- The user should assume conversation history remains on the local browser profile until extension data is cleared.
- The user should avoid scanning or sending sensitive pages unless they are comfortable with that content being processed by OpenRouter.

## Future Improvement Direction

- optional encryption for locally stored API keys
- clearer in-product privacy disclosure during onboarding
- export and deletion controls for local conversation history
