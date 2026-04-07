import { beforeEach, describe, expect, it } from 'vitest';

import {
  getExtensionSettings,
  getProviderConfiguration,
  getSavedApiKey,
  getSavedModelId,
  saveProviderConfiguration,
} from './settings';

type StorageMap = Record<string, unknown>;

const storageState: StorageMap = {};

beforeEach(() => {
  for (const key of Object.keys(storageState)) {
    delete storageState[key];
  }

  // @ts-expect-error test double for the chrome extension API
  globalThis.chrome = {
    storage: {
      local: {
        async get(key: string) {
          return {
            [key]: storageState[key],
          };
        },
        async set(nextValue: StorageMap) {
          Object.assign(storageState, nextValue);
        },
      },
    },
  };
});

describe('settings storage', () => {
  it('returns defaults when nothing is stored', async () => {
    const settings = await getExtensionSettings();

    expect(settings.hasCompletedOnboarding).toBe(false);
    expect(settings.selectedProvider).toBeNull();
    expect(settings.providerConfigs).toEqual({});
  });

  it('saves and reads the OpenRouter configuration', async () => {
    const settings = await saveProviderConfiguration(
      'openrouter',
      'test-api-key',
      'qwen/qwen3.6-plus:free',
    );

    expect(settings.hasCompletedOnboarding).toBe(true);
    expect(settings.selectedProvider).toBe('openrouter');
    expect(getSavedApiKey(settings, 'openrouter')).toBe('test-api-key');
    expect(getSavedModelId(settings, 'openrouter')).toBe(
      'qwen/qwen3.6-plus:free',
    );
    expect(getProviderConfiguration(settings, 'openrouter')).toEqual({
      apiKey: 'test-api-key',
      defaultModel: 'qwen/qwen3.6-plus:free',
    });
  });

  it('falls back to defaults when stored settings are invalid', async () => {
    storageState['extension-settings'] = {
      hasCompletedOnboarding: true,
      providerConfigs: 'invalid',
      selectedProvider: 'openrouter',
    };

    const settings = await getExtensionSettings();

    expect(settings.hasCompletedOnboarding).toBe(false);
    expect(settings.providerConfigs).toEqual({});
    expect(settings.selectedProvider).toBeNull();
  });
});
