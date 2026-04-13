import { describe, expect, it } from 'vitest';

import type { ModelDefinition } from '../../lib/providers/catalog';
import type { ExtensionSettings } from '../../lib/storage/settings';
import {
  filterModels,
  getInitialSelectedModel,
  getInitialSelectedProvider,
  getSnapshotAction,
  getSnapshotHelpText,
} from './popup-helpers';

const baseSettings: ExtensionSettings = {
  hasCompletedOnboarding: true,
  providerConfigs: {
    openrouter: {
      apiKey: 'test-key',
      defaultModel: 'qwen/qwen3.6-plus:free',
    },
  },
  selectedProvider: 'openrouter',
};

const modelCatalog: ModelDefinition[] = [
  {
    description: 'Free model',
    id: 'qwen/qwen3.6-plus:free',
    isFree: true,
    label: 'Qwen Free',
    providerName: 'Alibaba',
  },
  {
    description: 'Paid model',
    id: 'openai/gpt-4.1-mini',
    isFree: false,
    label: 'GPT 4.1 Mini',
    providerName: 'OpenAI',
  },
];

describe('popup helpers', () => {
  it('returns the stored provider and model defaults', () => {
    expect(getInitialSelectedProvider(baseSettings)).toBe('openrouter');
    expect(getInitialSelectedModel(baseSettings, 'openrouter')).toBe(
      'qwen/qwen3.6-plus:free',
    );
  });

  it('filters models by free-only and search query', () => {
    expect(
      filterModels({
        availableModels: modelCatalog,
        modelSearchQuery: '',
        selectedProvider: 'openrouter',
        showFreeOpenRouterModelsOnly: true,
      }),
    ).toEqual([modelCatalog[0]]);

    expect(
      filterModels({
        availableModels: modelCatalog,
        modelSearchQuery: 'gpt',
        selectedProvider: 'openrouter',
        showFreeOpenRouterModelsOnly: false,
      }),
    ).toEqual([modelCatalog[1]]);
  });

  it('returns help text and actions for popup error states', () => {
    expect(getSnapshotAction('model is rate-limited')).toBe('setup');
    expect(getSnapshotAction('page cannot be scanned')).toBe('refresh');
    expect(getSnapshotAction(null)).toBeNull();

    expect(getSnapshotHelpText('cannot be scanned', 'example.com')).toContain(
      'browser-internal page',
    );
    expect(getSnapshotHelpText('timed out', 'example.com')).toContain(
      'Refresh the current tab',
    );
    expect(getSnapshotHelpText(null, 'example.com')).toContain('example.com');
  });
});
