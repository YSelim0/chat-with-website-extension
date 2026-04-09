import type { ModelDefinition } from '../../lib/providers/catalog';

export function ModelSelectionPage({
  errorMessage,
  hasMoreModels,
  isLoadingModels,
  isSaving,
  modelListError,
  modelSearchQuery,
  models,
  providerLabel,
  providerSupportsDynamicModels,
  selectedModel,
  selectedModelId,
  showFreeOnly,
  onBack,
  onChooseModel,
  onLoadMoreModels,
  onModelSearchQueryChange,
  onSave,
  onToggleFreeOnly,
}: {
  errorMessage: string | null;
  hasMoreModels: boolean;
  isLoadingModels: boolean;
  isSaving: boolean;
  modelListError: string | null;
  modelSearchQuery: string;
  models: ModelDefinition[];
  providerLabel: string;
  providerSupportsDynamicModels: boolean;
  selectedModel: ModelDefinition | null;
  selectedModelId: string;
  showFreeOnly: boolean;
  onBack: () => void;
  onChooseModel: (modelId: string) => void;
  onLoadMoreModels: () => void;
  onModelSearchQueryChange: (nextValue: string) => void;
  onSave: () => void;
  onToggleFreeOnly: () => void;
}) {
  return (
    <section className="screen-panel">
      <header className="screen-header">
        <h1>Choose a default model</h1>
        <p className="subtitle">
          Your {providerLabel} account can expose many models. Pick the default
          one for new conversations, then change it later from settings.
        </p>
      </header>

      {providerSupportsDynamicModels ? (
        <section className="card card--accent-soft model-tools">
          <input
            className="text-input"
            onChange={(event) => onModelSearchQueryChange(event.target.value)}
            placeholder="Search OpenRouter models"
            type="text"
            value={modelSearchQuery}
          />

          <label className="toggle-row">
            <input
              checked={showFreeOnly}
              onChange={onToggleFreeOnly}
              type="checkbox"
            />
            <span className="helper-text helper-text--tight">Free only</span>
          </label>

          {isLoadingModels ? (
            <p className="helper-text helper-text--body">
              Loading OpenRouter models...
            </p>
          ) : null}

          {modelListError ? (
            <p className="helper-text helper-text--body">
              Could not load the live model list. Showing fallback models
              instead.
            </p>
          ) : null}

          {selectedModel ? (
            <p className="selected-model-inline">
              Selected model: <span>{selectedModel.label}</span>
              {selectedModel.isFree ? ' · Free' : ''}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="provider-grid provider-grid--scrollable">
        {models.length === 0 ? (
          <section className="card card--accent-soft">
            <p className="helper-text helper-text--body">
              No models matched the current filters.
            </p>
          </section>
        ) : (
          models.map((model) => {
            const isSelected = model.id === selectedModelId;

            return (
              <button
                className={`provider-card${isSelected ? ' provider-card--selected' : ''}`}
                key={model.id}
                onClick={() => onChooseModel(model.id)}
                type="button"
              >
                <div className="provider-card__row">
                  <span className="provider-card__title">{model.label}</span>
                  {model.isFree ? (
                    <span className="model-badge">Free</span>
                  ) : null}
                </div>
                {model.providerName ? (
                  <span className="provider-card__meta">
                    {model.providerName}
                  </span>
                ) : null}
                <span className="provider-card__description">
                  {model.description}
                </span>
              </button>
            );
          })
        )}

        {hasMoreModels ? (
          <button
            className="button button--ghost model-load-more"
            onClick={onLoadMoreModels}
            type="button"
          >
            Load more models
          </button>
        ) : null}
      </div>

      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

      <div className="button-row button-row--sticky">
        <button className="button button--ghost" onClick={onBack} type="button">
          Back
        </button>
        <button
          className="button button--primary"
          disabled={isSaving || !selectedModelId}
          onClick={onSave}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </section>
  );
}
