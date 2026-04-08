import type { ModelDefinition } from '../../lib/providers/catalog';
import { getDefaultModelForProvider } from '../../lib/providers/catalog';
import {
  type ExtensionSettings,
  getSavedModelId,
} from '../../lib/storage/settings';
import type { SupportedProvider } from '../../types/runtime';

export const POPUP_EXTRACTION_TIMEOUT_MS = 50000;
export const MINIMUM_SCANNING_DURATION_MS = 900;
export const MODEL_PAGE_SIZE = 20;

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function getInitialSelectedProvider(
  settings: ExtensionSettings,
): SupportedProvider {
  return settings.selectedProvider ?? 'openrouter';
}

export function getInitialSelectedModel(
  settings: ExtensionSettings,
  provider: SupportedProvider,
) {
  return (
    getSavedModelId(settings, provider) ??
    getDefaultModelForProvider(provider)?.id ??
    ''
  );
}

export function getSnapshotHelpText(
  errorMessage: string | null,
  activeHostname: string | null,
) {
  if (errorMessage?.includes('cannot be scanned')) {
    return 'Open a regular website tab, not a browser-internal page, then try scanning again.';
  }

  if (errorMessage?.includes('timed out')) {
    return 'Refresh the current tab or switch to a simpler page, then try scanning again.';
  }

  if (errorMessage?.includes('Could not reach OpenRouter')) {
    return 'Check your internet connection before retrying the request.';
  }

  if (errorMessage?.includes('rate-limited')) {
    return 'Try again shortly or open Setup to choose another free model.';
  }

  return `No saved snapshot yet for ${activeHostname ?? 'the current tab'}. Scan the page to start a grounded chat.`;
}

export function getSnapshotAction(errorMessage: string | null) {
  if (errorMessage?.includes('rate-limited')) {
    return 'setup' as const;
  }

  if (
    errorMessage?.includes('cannot be scanned') ||
    errorMessage?.includes('timed out') ||
    errorMessage?.includes('Could not reach OpenRouter')
  ) {
    return 'refresh' as const;
  }

  return null;
}

export function filterModels({
  availableModels,
  modelSearchQuery,
  selectedProvider,
  showFreeOpenRouterModelsOnly,
}: {
  availableModels: ModelDefinition[];
  modelSearchQuery: string;
  selectedProvider: SupportedProvider;
  showFreeOpenRouterModelsOnly: boolean;
}) {
  const normalizedQuery = modelSearchQuery.trim().toLowerCase();

  return availableModels.filter((model) => {
    if (
      selectedProvider === 'openrouter' &&
      showFreeOpenRouterModelsOnly &&
      !model.isFree
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [model.id, model.label, model.providerName ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}
