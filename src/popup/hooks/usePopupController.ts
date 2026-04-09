import { useMemo } from 'react';

import { getProviderDefinition } from '../../lib/providers/catalog';
import { usePopupSession } from '../context/PopupSessionContext';
import { filterModels } from '../utils/popup-helpers';
import { useOpenRouterModels } from './useOpenRouterModels';
import { usePopupBootstrap } from './usePopupBootstrap';
import { usePopupChatFlow } from './usePopupChatFlow';

export function usePopupController() {
  const session = usePopupSession();

  usePopupBootstrap({ setSessionState: session.setSessionState });
  useOpenRouterModels({
    screen: session.screen,
    selectedModelId: session.selectedModelId,
    selectedProvider: session.selectedProvider,
    setSessionState: session.setSessionState,
  });

  const selectedProviderDefinition = useMemo(() => {
    return getProviderDefinition(session.selectedProvider);
  }, [session.selectedProvider]);

  const selectedModelDefinition = useMemo(() => {
    return selectedProviderDefinition?.models.find(
      (model) => model.id === session.selectedModelId,
    );
  }, [session.selectedModelId, selectedProviderDefinition]);

  const availableModels = useMemo(() => {
    if (!selectedProviderDefinition) {
      return [];
    }

    if (session.selectedProvider !== 'openrouter') {
      return selectedProviderDefinition.models;
    }

    return session.openRouterModels.length > 0
      ? session.openRouterModels
      : selectedProviderDefinition.models;
  }, [
    session.openRouterModels,
    session.selectedProvider,
    selectedProviderDefinition,
  ]);

  const filteredModels = useMemo(() => {
    return filterModels({
      availableModels,
      modelSearchQuery: session.modelSearchQuery,
      selectedProvider: session.selectedProvider,
      showFreeOpenRouterModelsOnly: session.showFreeOpenRouterModelsOnly,
    });
  }, [
    availableModels,
    session.modelSearchQuery,
    session.selectedProvider,
    session.showFreeOpenRouterModelsOnly,
  ]);

  const selectedModelFromAvailableList = useMemo(() => {
    return (
      availableModels.find((model) => model.id === session.selectedModelId) ??
      null
    );
  }, [availableModels, session.selectedModelId]);

  const visibleModels = useMemo(() => {
    return filteredModels.slice(0, session.visibleModelCount);
  }, [filteredModels, session.visibleModelCount]);

  const hasMoreModels = filteredModels.length > visibleModels.length;
  const isUsingLiveSnapshot =
    Boolean(session.activeSnapshot?.id) &&
    session.activeSnapshot?.id === session.latestSnapshot?.id;

  const {
    handleAskQuestion,
    handleOpenConversation,
    handleOpenProviderSettings,
    handleQuestionInputKeyDown,
    handleRefreshContext,
    handleSaveProviderConfiguration,
  } = usePopupChatFlow({
    activeSnapshot: session.activeSnapshot,
    apiKeyInput: session.apiKeyInput,
    isSubmittingQuestion: session.isSubmittingQuestion,
    questionInput: session.questionInput,
    selectedModelId: session.selectedModelId,
    selectedProvider: session.selectedProvider,
    setSessionState: session.setSessionState,
    settings: session.settings,
  });

  function handleContinueFromWelcome() {
    session.setSessionState({ screen: 'provider-setup' });
  }

  function handleBackToProviders() {
    session.setSessionState({ errorMessage: null, screen: 'welcome' });
  }

  function handleContinueToModelSelection() {
    const trimmedApiKey = session.apiKeyInput.trim();

    if (!trimmedApiKey) {
      session.setSessionState({
        errorMessage: 'Enter an API key before continuing.',
      });
      return;
    }

    session.setSessionState({ errorMessage: null, screen: 'model-selection' });
  }

  function handleBackToProviderSetup() {
    session.setSessionState({ errorMessage: null, screen: 'provider-setup' });
  }

  function handleOpenHistoryPanel() {
    session.setSessionState({ readyPanel: 'history' });
  }

  function handleReturnToChatPanel() {
    session.setSessionState({ readyPanel: 'chat' });
  }

  return {
    ...session,
    hasMoreModels,
    isUsingLiveSnapshot,
    selectedModelDefinition,
    selectedModelFromAvailableList,
    selectedProviderDefinition,
    visibleModels,
    handleAskQuestion,
    handleBackToProviderSetup,
    handleBackToProviders,
    handleContinueFromWelcome,
    handleContinueToModelSelection,
    handleOpenConversation,
    handleOpenHistoryPanel,
    handleOpenProviderSettings,
    handleQuestionInputKeyDown,
    handleRefreshContext,
    handleReturnToChatPanel,
    handleSaveProviderConfiguration,
    setApiKeyInput: (apiKeyInput: string) =>
      session.setSessionState({ apiKeyInput }),
    setModelSearchQuery: (modelSearchQuery: string) =>
      session.setSessionState({ modelSearchQuery }),
    setQuestionInput: (questionInput: string) =>
      session.setSessionState({ questionInput }),
    setSelectedModelId: (selectedModelId: string) =>
      session.setSessionState({ selectedModelId }),
    setShowFreeOpenRouterModelsOnly: (
      updater: boolean | ((currentValue: boolean) => boolean),
    ) =>
      session.setSessionState({
        showFreeOpenRouterModelsOnly:
          typeof updater === 'function'
            ? updater(session.showFreeOpenRouterModelsOnly)
            : updater,
      }),
    setVisibleModelCount: (
      updater: number | ((currentValue: number) => number),
    ) =>
      session.setSessionState({
        visibleModelCount:
          typeof updater === 'function'
            ? updater(session.visibleModelCount)
            : updater,
      }),
  };
}
