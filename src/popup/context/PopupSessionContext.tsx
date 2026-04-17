import {
  createContext,
  type Dispatch,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';

import type { ModelDefinition } from '../../lib/providers/catalog';
import type { ExtensionSettings } from '../../lib/storage/settings';
import type {
  Conversation,
  ConversationMessage,
  ConversationSummary,
} from '../../types/chat';
import type { SnapshotSummary } from '../../types/page-context';
import type { SupportedProvider } from '../../types/runtime';

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
  apiKeyInput: string;
  conversationHistory: ConversationSummary[];
  conversationMessages: ConversationMessage[];
  errorMessage: string | null;
  isLoadingOpenRouterModels: boolean;
  isRefreshingContext: boolean;
  isSaving: boolean;
  isAssistantThinking: boolean;
  isSubmittingQuestion: boolean;
  latestSnapshot: SnapshotSummary | null;
  modelSearchQuery: string;
  openRouterModels: ModelDefinition[];
  openRouterModelError: string | null;
  questionInput: string;
  readyPanel: ReadyPanel;
  screen: PopupScreen;
  selectedModelId: string;
  selectedProvider: SupportedProvider;
  settings: ExtensionSettings | null;
  showFreeOpenRouterModelsOnly: boolean;
  visibleModelCount: number;
};

type PopupSessionAction = {
  type: 'patch-state';
  payload: Partial<PopupSessionState>;
};

const initialPopupSessionState: PopupSessionState = {
  activeConversation: null,
  activeHostname: null,
  activeSnapshot: null,
  apiKeyInput: '',
  conversationHistory: [],
  conversationMessages: [],
  errorMessage: null,
  isLoadingOpenRouterModels: false,
  isRefreshingContext: false,
  isSaving: false,
  isAssistantThinking: false,
  isSubmittingQuestion: false,
  latestSnapshot: null,
  modelSearchQuery: '',
  openRouterModels: [],
  openRouterModelError: null,
  questionInput: '',
  readyPanel: 'chat',
  screen: 'loading',
  selectedModelId: '',
  selectedProvider: 'openrouter',
  settings: null,
  showFreeOpenRouterModelsOnly: true,
  visibleModelCount: 20,
};

function popupSessionReducer(
  state: PopupSessionState,
  action: PopupSessionAction,
): PopupSessionState {
  switch (action.type) {
    case 'patch-state':
      return {
        ...state,
        ...action.payload,
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

export function usePopupSession() {
  const state = usePopupSessionState();
  const dispatch = usePopupSessionDispatch();

  const setSessionState = useCallback(
    (payload: Partial<PopupSessionState>) => {
      dispatch({ type: 'patch-state', payload });
    },
    [dispatch],
  );

  return {
    ...state,
    setSessionState,
  };
}
