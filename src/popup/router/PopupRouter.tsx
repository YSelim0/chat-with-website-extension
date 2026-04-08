import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

import { LoadingPage } from '../pages/LoadingPage';
import { ScanningPage } from '../pages/ScanningPage';
import { SetupPage } from '../pages/SetupPage';
import { WelcomePage } from '../pages/WelcomePage';
import { popupPaths } from './popup-paths';

type PopupScreen =
  | 'loading'
  | 'welcome'
  | 'provider-setup'
  | 'model-selection'
  | 'scanning'
  | 'ready';

type ReadyPanel = 'chat' | 'history';

function getTargetPath(screen: PopupScreen, readyPanel: ReadyPanel) {
  switch (screen) {
    case 'loading':
      return popupPaths.loading;
    case 'welcome':
      return popupPaths.welcome;
    case 'provider-setup':
      return popupPaths.setup;
    case 'model-selection':
      return popupPaths.models;
    case 'scanning':
      return popupPaths.scanning;
    case 'ready':
      return readyPanel === 'history'
        ? popupPaths.appHistory
        : popupPaths.appChat;
    default:
      return popupPaths.loading;
  }
}

function PopupRouteRedirect({
  readyPanel,
  screen,
}: {
  readyPanel: ReadyPanel;
  screen: PopupScreen;
}) {
  return <Navigate replace to={getTargetPath(screen, readyPanel)} />;
}

function PopupRouteSync({
  readyPanel,
  screen,
}: {
  readyPanel: ReadyPanel;
  screen: PopupScreen;
}) {
  const navigate = useNavigate();
  const targetPath = getTargetPath(screen, readyPanel);

  useEffect(() => {
    navigate(targetPath, { replace: true });
  }, [navigate, targetPath]);

  return null;
}

export function PopupRouter({
  activeHostname,
  apiKeyInput,
  appChatElement,
  appHistoryElement,
  errorMessage,
  modelSelectionElement,
  providerHint,
  providerLabel,
  providerPlaceholder,
  readyPanel,
  screen,
  onApiKeyInputChange,
  onBackFromSetup,
  onContinueFromSetup,
  onContinueFromWelcome,
}: {
  activeHostname: string | null;
  apiKeyInput: string;
  appChatElement: ReactNode;
  appHistoryElement: ReactNode;
  errorMessage: string | null;
  modelSelectionElement: ReactNode;
  providerHint: string;
  providerLabel: string;
  providerPlaceholder: string;
  readyPanel: ReadyPanel;
  screen: PopupScreen;
  onApiKeyInputChange: (nextValue: string) => void;
  onBackFromSetup: () => void;
  onContinueFromSetup: () => void;
  onContinueFromWelcome: () => void;
}) {
  return (
    <MemoryRouter initialEntries={[getTargetPath(screen, readyPanel)]}>
      <PopupRouteSync readyPanel={readyPanel} screen={screen} />
      <Routes>
        <Route
          path="/"
          element={
            <PopupRouteRedirect readyPanel={readyPanel} screen={screen} />
          }
        />
        <Route path={popupPaths.loading} element={<LoadingPage />} />
        <Route
          path={popupPaths.welcome}
          element={<WelcomePage onContinue={onContinueFromWelcome} />}
        />
        <Route
          path={popupPaths.setup}
          element={
            <SetupPage
              apiKeyInput={apiKeyInput}
              errorMessage={errorMessage}
              providerHint={providerHint}
              providerLabel={providerLabel}
              providerPlaceholder={providerPlaceholder}
              onApiKeyInputChange={onApiKeyInputChange}
              onBack={onBackFromSetup}
              onContinue={onContinueFromSetup}
            />
          }
        />
        <Route path={popupPaths.models} element={modelSelectionElement} />
        <Route
          path={popupPaths.scanning}
          element={<ScanningPage activeHostname={activeHostname} />}
        />
        <Route path={popupPaths.appChat} element={appChatElement} />
        <Route path={popupPaths.appHistory} element={appHistoryElement} />
        <Route
          path="*"
          element={
            <PopupRouteRedirect readyPanel={readyPanel} screen={screen} />
          }
        />
      </Routes>
    </MemoryRouter>
  );
}
