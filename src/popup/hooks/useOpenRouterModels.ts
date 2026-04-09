import { useEffect } from 'react';

import type { ListOpenRouterModelsResponse } from '../../types/provider-models';
import type {
  PopupScreen,
  PopupSessionState,
} from '../context/PopupSessionContext';

export function useOpenRouterModels({
  screen,
  selectedModelId,
  selectedProvider,
  setSessionState,
}: {
  screen: PopupScreen;
  selectedModelId: string;
  selectedProvider: PopupSessionState['selectedProvider'];
  setSessionState: (payload: Partial<PopupSessionState>) => void;
}) {
  useEffect(() => {
    if (screen !== 'model-selection' || selectedProvider !== 'openrouter') {
      return;
    }

    let isMounted = true;

    async function loadOpenRouterModels() {
      try {
        setSessionState({
          isLoadingOpenRouterModels: true,
          openRouterModelError: null,
        });

        const response = (await chrome.runtime.sendMessage({
          type: 'openrouter:list-models',
        })) as ListOpenRouterModelsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setSessionState({
            openRouterModelError: response.error,
            openRouterModels: [],
          });
          return;
        }

        setSessionState({ openRouterModels: response.models });

        const hasCurrentSelection = response.models.some(
          (model) => model.id === selectedModelId,
        );

        if (hasCurrentSelection) {
          return;
        }

        const preferredModel =
          response.models.find(
            (model) => model.id === 'qwen/qwen3.6-plus:free',
          ) ||
          response.models.find((model) => model.isFree) ||
          response.models[0];

        if (preferredModel) {
          setSessionState({ selectedModelId: preferredModel.id });
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSessionState({
          openRouterModelError:
            error instanceof Error
              ? error.message
              : 'Failed to load the OpenRouter model list.',
          openRouterModels: [],
        });
      } finally {
        if (isMounted) {
          setSessionState({ isLoadingOpenRouterModels: false });
        }
      }
    }

    void loadOpenRouterModels();

    return () => {
      isMounted = false;
    };
  }, [screen, selectedModelId, selectedProvider, setSessionState]);
}
