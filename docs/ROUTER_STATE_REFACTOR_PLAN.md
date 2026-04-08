# Router And State Refactor Plan

## Goal

Break the popup out of the current monolithic `PopupApp.tsx` file and move toward a routed popup structure with clearer state boundaries.

## Why

- `PopupApp.tsx` has grown too large to maintain safely.
- popup screens already behave like distinct application states
- routing will make page-level responsibilities clearer
- the current state orchestration should be prepared for future side-panel or settings expansion

## Route Plan

Use popup-local routing with `react-router-dom` and a memory-based router.

- `/loading`
- `/welcome`
- `/setup`
- `/models`
- `/scanning`
- `/app/chat`
- `/app/history`

## State Strategy

Refactor in two steps instead of moving everything at once.

### Step 1

- keep orchestration state in `PopupApp`
- move UI into routed pages and smaller components
- sync the current screen state into router navigation

### Step 2

- move shared popup state into a dedicated popup session context with reducer actions
- reduce prop drilling between routed pages
- make chat, history, and setup flows easier to test in isolation

## Target Structure

```txt
src/popup/
  PopupApp.tsx
  router/
    PopupRouter.tsx
    popup-paths.ts
  pages/
    LoadingPage.tsx
    WelcomePage.tsx
    SetupPage.tsx
    ModelSelectionPage.tsx
    ScanningPage.tsx
    ChatPage.tsx
    HistoryPage.tsx
  components/
    SnapshotCard.tsx
    MessageList.tsx
    Composer.tsx
  context/
    PopupSessionContext.tsx
```

## Refactor Order

1. Add router foundation and page components
2. Move current screen rendering into routes
3. Introduce popup session context and reducer
4. Move shared UI pieces into reusable components
5. Add route guards and final cleanup

## Success Criteria

- popup behavior remains unchanged
- `PopupApp.tsx` becomes an orchestration shell instead of a giant UI file
- routed pages are easier to reason about and test
- future settings and side-panel work has a cleaner foundation
