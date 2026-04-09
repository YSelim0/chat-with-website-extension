import { useEffect } from 'react';

import { getActiveTabHostname } from '../../lib/browser/active-tab';
import {
  getConversationBySnapshotId,
  listConversationSummaries,
} from '../../lib/storage/conversations';
import { getLatestSnapshotForHostname } from '../../lib/storage/page-snapshots';
import {
  getExtensionSettings,
  getSavedApiKey,
} from '../../lib/storage/settings';
import type { PopupSessionState } from '../context/PopupSessionContext';
import {
  getInitialSelectedModel,
  getInitialSelectedProvider,
} from '../utils/popup-helpers';

export function usePopupBootstrap({
  setSessionState,
}: {
  setSessionState: (payload: Partial<PopupSessionState>) => void;
}) {
  useEffect(() => {
    let isMounted = true;

    async function loadPopupState() {
      try {
        const [storedSettings, hostname] = await Promise.all([
          getExtensionSettings(),
          getActiveTabHostname(),
        ]);

        if (!isMounted) {
          return;
        }

        const initialProvider = getInitialSelectedProvider(storedSettings);

        setSessionState({
          settings: storedSettings,
          selectedProvider: initialProvider,
          selectedModelId: getInitialSelectedModel(
            storedSettings,
            initialProvider,
          ),
          apiKeyInput: getSavedApiKey(storedSettings, initialProvider),
          activeHostname: hostname,
        });

        const history = await listConversationSummaries();
        setSessionState({ conversationHistory: history });

        if (hostname) {
          const latestSnapshotForHostname =
            await getLatestSnapshotForHostname(hostname);

          setSessionState({
            latestSnapshot: latestSnapshotForHostname,
            activeSnapshot: latestSnapshotForHostname,
          });

          if (latestSnapshotForHostname) {
            const existingConversation = await getConversationBySnapshotId(
              latestSnapshotForHostname.id,
            );

            setSessionState({
              activeConversation: existingConversation?.conversation ?? null,
              conversationMessages: existingConversation?.messages ?? [],
            });
          }
        }

        setSessionState({
          screen: storedSettings.hasCompletedOnboarding ? 'ready' : 'welcome',
        });
      } catch (error) {
        console.error('Failed to initialize popup state.', error);

        if (!isMounted) {
          return;
        }

        setSessionState({
          errorMessage:
            'Failed to load extension settings. Please reopen the popup.',
          screen: 'welcome',
        });
      }
    }

    void loadPopupState();

    return () => {
      isMounted = false;
    };
  }, [setSessionState]);
}
