# Release Checklist

## Goal

Use this checklist before creating a production-facing release candidate of the OpenRouter-first browser extension.

## Build Verification

- Run `npm run check`
- Run `npm test`
- Run `npm run build`
- Confirm the build output exists under `.output/chrome-mv3`

## Extension Loading

- Open `chrome://extensions`
- Enable `Developer mode`
- Load or reload the unpacked extension from `.output/chrome-mv3`
- Confirm the extension icon uses the branded app logo

## First-Run Setup

- Open the extension on a normal `http` or `https` page
- Confirm the welcome screen is OpenRouter-first
- Enter a valid OpenRouter API key
- Open the model picker and verify:
  - search works
  - `Free only` works
  - `Load more models` works
- Save setup and confirm the scanning screen appears

## Page Scanning

- Confirm scanning succeeds on a normal content page
- Confirm the snapshot card shows:
  - page title
  - chunk count
  - text length
  - extraction time
- Test `Refresh` and confirm a new snapshot can be created

## Chat Flow

- Ask a grounded question after scanning
- Confirm the assistant answers using the page context
- Confirm `Enter` sends the message
- Confirm `Shift+Enter` inserts a new line
- Confirm new messages auto-scroll to the bottom
- Confirm the composer stays pinned at the bottom

## Error Handling

- Test on an unsupported page such as `chrome://extensions`
- Confirm the popup shows a clear scan limitation message
- Test with network disabled and confirm OpenRouter errors are readable
- Test a temporary OpenRouter free-model rate-limit scenario if possible
- Confirm the popup suggests retrying or changing models when relevant

## History and Continuity

- Send at least one message on two different pages
- Open `History`
- Confirm conversations are listed with:
  - title
  - hostname
  - message count
  - model
  - updated timestamp
- Reopen a saved conversation
- Confirm archived versus live snapshot labeling is correct

## UX Review

- Confirm long hostnames do not break the header layout
- Confirm icon buttons render correctly for:
  - history
  - refresh
  - setup
  - send
- Confirm empty states remain readable and actionable

## Final Sanity Check

- Review `manifest.json` output for expected permissions and host permissions
- Confirm only OpenRouter host permissions are present
- Confirm no unintended untracked files are included in the release commit
