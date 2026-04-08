import { usePopupController } from './hooks/usePopupController';
import { ConfiguredPage } from './pages/ConfiguredPage';
import { ModelSelectionPage } from './pages/ModelSelectionPage';
import { PopupRouter } from './router/PopupRouter';

export function PopupApp() {
  const controller = usePopupController();

  return (
    <PopupRouter
      activeHostname={controller.activeHostname}
      apiKeyInput={controller.apiKeyInput}
      appChatElement={
        controller.selectedProviderDefinition ? (
          <ConfiguredPage
            activeConversation={controller.activeConversation}
            activeHostname={controller.activeHostname}
            activeSnapshot={controller.activeSnapshot}
            conversationHistory={controller.conversationHistory}
            conversationMessages={controller.conversationMessages}
            errorMessage={controller.errorMessage}
            isRefreshingContext={controller.isRefreshingContext}
            isSubmittingQuestion={controller.isSubmittingQuestion}
            isUsingLiveSnapshot={controller.isUsingLiveSnapshot}
            latestSnapshot={controller.latestSnapshot}
            modelLabel={
              controller.selectedModelDefinition?.label ?? 'No model selected'
            }
            questionInput={controller.questionInput}
            readyPanel="chat"
            setQuestionInput={controller.setQuestionInput}
            onAskQuestion={controller.handleAskQuestion}
            onOpenConversation={controller.handleOpenConversation}
            onOpenHistoryPanel={controller.handleOpenHistoryPanel}
            onOpenProviderSettings={controller.handleOpenProviderSettings}
            onQuestionInputKeyDown={controller.handleQuestionInputKeyDown}
            onRefreshContext={controller.handleRefreshContext}
            onReturnToChatPanel={controller.handleReturnToChatPanel}
          />
        ) : null
      }
      appHistoryElement={
        controller.selectedProviderDefinition ? (
          <ConfiguredPage
            activeConversation={controller.activeConversation}
            activeHostname={controller.activeHostname}
            activeSnapshot={controller.activeSnapshot}
            conversationHistory={controller.conversationHistory}
            conversationMessages={controller.conversationMessages}
            errorMessage={controller.errorMessage}
            isRefreshingContext={controller.isRefreshingContext}
            isSubmittingQuestion={controller.isSubmittingQuestion}
            isUsingLiveSnapshot={controller.isUsingLiveSnapshot}
            latestSnapshot={controller.latestSnapshot}
            modelLabel={
              controller.selectedModelDefinition?.label ?? 'No model selected'
            }
            questionInput={controller.questionInput}
            readyPanel="history"
            setQuestionInput={controller.setQuestionInput}
            onAskQuestion={controller.handleAskQuestion}
            onOpenConversation={controller.handleOpenConversation}
            onOpenHistoryPanel={controller.handleOpenHistoryPanel}
            onOpenProviderSettings={controller.handleOpenProviderSettings}
            onQuestionInputKeyDown={controller.handleQuestionInputKeyDown}
            onRefreshContext={controller.handleRefreshContext}
            onReturnToChatPanel={controller.handleReturnToChatPanel}
          />
        ) : null
      }
      errorMessage={controller.errorMessage}
      modelSelectionElement={
        controller.selectedProviderDefinition ? (
          <ModelSelectionPage
            errorMessage={controller.errorMessage}
            hasMoreModels={controller.hasMoreModels}
            isLoadingModels={controller.isLoadingOpenRouterModels}
            isSaving={controller.isSaving}
            modelListError={controller.openRouterModelError}
            modelSearchQuery={controller.modelSearchQuery}
            models={controller.visibleModels}
            providerLabel={controller.selectedProviderDefinition.label}
            providerSupportsDynamicModels={
              controller.selectedProvider === 'openrouter'
            }
            selectedModel={controller.selectedModelFromAvailableList}
            selectedModelId={controller.selectedModelId}
            showFreeOnly={controller.showFreeOpenRouterModelsOnly}
            onBack={controller.handleBackToProviderSetup}
            onChooseModel={controller.setSelectedModelId}
            onLoadMoreModels={() => {
              controller.setVisibleModelCount(
                (currentValue) => currentValue + 20,
              );
            }}
            onModelSearchQueryChange={(nextValue) => {
              controller.setModelSearchQuery(nextValue);
              controller.setVisibleModelCount(20);
            }}
            onSave={controller.handleSaveProviderConfiguration}
            onToggleFreeOnly={() => {
              controller.setShowFreeOpenRouterModelsOnly(
                (currentValue) => !currentValue,
              );
              controller.setVisibleModelCount(20);
            }}
          />
        ) : null
      }
      providerHint={controller.selectedProviderDefinition?.keyHint ?? ''}
      providerLabel={
        controller.selectedProviderDefinition?.label ?? 'OpenRouter'
      }
      providerPlaceholder={
        controller.selectedProviderDefinition?.keyPlaceholder ?? ''
      }
      readyPanel={controller.readyPanel}
      screen={controller.screen}
      onApiKeyInputChange={controller.setApiKeyInput}
      onBackFromSetup={controller.handleBackToProviders}
      onContinueFromSetup={controller.handleContinueToModelSelection}
      onContinueFromWelcome={controller.handleContinueFromWelcome}
    />
  );
}
