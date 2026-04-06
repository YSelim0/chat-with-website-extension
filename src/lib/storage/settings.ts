import { z } from 'zod';

import type { SupportedProvider } from '../../types/runtime';

const extensionSettingsSchema = z.object({
  selectedProvider: z
    .enum(['openai', 'gemini', 'claude', 'groq', 'openrouter'])
    .nullable(),
  providerApiKeys: z.record(
    z.enum(['openai', 'gemini', 'claude', 'groq', 'openrouter']),
    z.string(),
  ),
  hasCompletedOnboarding: z.boolean(),
});

export type ExtensionSettings = z.infer<typeof extensionSettingsSchema>;

const STORAGE_KEY = 'extension-settings';

const defaultSettings: ExtensionSettings = {
  selectedProvider: null,
  providerApiKeys: {},
  hasCompletedOnboarding: false,
};

/** Reads and validates persisted extension settings. */
export async function getExtensionSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const parsedSettings = extensionSettingsSchema.safeParse(result[STORAGE_KEY]);

  if (!parsedSettings.success) {
    return defaultSettings;
  }

  return {
    ...defaultSettings,
    ...parsedSettings.data,
  };
}

/** Persists the selected provider and its API key locally on the user's device. */
export async function saveProviderConfiguration(
  provider: SupportedProvider,
  apiKey: string,
) {
  const currentSettings = await getExtensionSettings();

  const nextSettings: ExtensionSettings = {
    selectedProvider: provider,
    providerApiKeys: {
      ...currentSettings.providerApiKeys,
      [provider]: apiKey,
    },
    hasCompletedOnboarding: true,
  };

  await chrome.storage.local.set({
    [STORAGE_KEY]: nextSettings,
  });

  return nextSettings;
}

export function getSavedApiKey(
  settings: ExtensionSettings,
  provider: SupportedProvider,
) {
  return settings.providerApiKeys[provider] ?? '';
}
