import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useMemo,
  useReducer,
} from 'react';

import type { ModelDefinition } from '../../lib/providers/catalog';
import type {
  Conversation,
  ConversationMessage,
  ConversationSummary,
} from '../../types/chat';
import type { SnapshotSummary } from '../../types/page-context';

export type PopupScreen =
  | 'loading'
  | 'welcome'
  | 'provider-setup'
  | 'model-selection'
  | 'scanning'
  | 'ready';

export type ReadyPanel = 'chat' | 'history';

export type PopupSessionState = {
  activeConversation: Conversation | null;
  activeHostname: string | null;
  activeSnapshot: SnapshotSummary | null;
  conversationHistory: ConversationSummary[];
  conversationMessages: ConversationMessage[];
  errorMessage: string | null;
  latestSnapshot: SnapshotSummary | null;
  openRouterModels: ModelDefinition[];
  readyPanel: ReadyPanel;
  screen: PopupScreen;
};

type PopupSessionAction =
  | { type: 'set-screen'; screen: PopupScreen }
  | { type: 'set-ready-panel'; readyPanel: ReadyPanel }
  | { type: 'set-error'; errorMessage: string | null }
  | {
      type: 'hydrate-ready-state';
      activeConversation: Conversation | null;
      activeHostname: string | null;
      activeSnapshot: SnapshotSummary | null;
      conversationHistory: ConversationSummary[];
      conversationMessages: ConversationMessage[];
      latestSnapshot: SnapshotSummary | null;
      openRouterModels: ModelDefinition[];
    };

const initialPopupSessionState: PopupSessionState = {
  activeConversation: null,
  activeHostname: null,
  activeSnapshot: null,
  conversationHistory: [],
  conversationMessages: [],
  errorMessage: null,
  latestSnapshot: null,
  openRouterModels: [],
  readyPanel: 'chat',
  screen: 'loading',
};

function popupSessionReducer(
  state: PopupSessionState,
  action: PopupSessionAction,
): PopupSessionState {
  switch (action.type) {
    case 'set-screen':
      return { ...state, screen: action.screen };
    case 'set-ready-panel':
      return { ...state, readyPanel: action.readyPanel };
    case 'set-error':
      return { ...state, errorMessage: action.errorMessage };
    case 'hydrate-ready-state':
      return {
        ...state,
        activeConversation: action.activeConversation,
        activeHostname: action.activeHostname,
        activeSnapshot: action.activeSnapshot,
        conversationHistory: action.conversationHistory,
        conversationMessages: action.conversationMessages,
        latestSnapshot: action.latestSnapshot,
        openRouterModels: action.openRouterModels,
      };
    default:
      return state;
  }
}

const PopupSessionStateContext = createContext<PopupSessionState | null>(null);
const PopupSessionDispatchContext =
  createContext<Dispatch<PopupSessionAction> | null>(null);

export function PopupSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    popupSessionReducer,
    initialPopupSessionState,
  );

  const memoizedState = useMemo(() => state, [state]);

  return (
    <PopupSessionStateContext.Provider value={memoizedState}>
      <PopupSessionDispatchContext.Provider value={dispatch}>
        {children}
      </PopupSessionDispatchContext.Provider>
    </PopupSessionStateContext.Provider>
  );
}

export function usePopupSessionState() {
  const state = useContext(PopupSessionStateContext);

  if (!state) {
    throw new Error(
      'usePopupSessionState must be used within PopupSessionProvider.',
    );
  }

  return state;
}

export function usePopupSessionDispatch() {
  const dispatch = useContext(PopupSessionDispatchContext);

  if (!dispatch) {
    throw new Error(
      'usePopupSessionDispatch must be used within PopupSessionProvider.',
    );
  }

  return dispatch;
}
