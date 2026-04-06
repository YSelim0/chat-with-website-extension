import type { SupportedProvider } from '../../types/runtime';

export type ProviderDefinition = {
  id: SupportedProvider;
  label: string;
  description: string;
  keyPlaceholder: string;
  keyHint: string;
};

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Best for general grounded chat on current website content.',
    keyPlaceholder: 'sk-********************************',
    keyHint: 'Uses your local API key stored in extension storage.',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Google models for site-grounded conversations and summaries.',
    keyPlaceholder: 'AIza********************************',
    keyHint:
      'Use a Gemini API key from Google AI Studio or supported Google setup.',
  },
  {
    id: 'claude',
    label: 'Claude',
    description:
      'Anthropic models with a focused provider-specific setup path.',
    keyPlaceholder: 'sk-ant-********************************',
    keyHint: 'Stored only on this device unless you remove the extension data.',
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Fast responses with OpenAI-compatible request semantics.',
    keyPlaceholder: 'gsk_********************************',
    keyHint: 'Good fit for fast retrieval-based question answering.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Access multiple models through one provider and one key.',
    keyPlaceholder: 'sk-or-v1-********************************',
    keyHint:
      'A flexible choice if you want one integration point for many models.',
  },
];

export function getProviderDefinition(providerId: SupportedProvider) {
  return PROVIDERS.find((provider) => provider.id === providerId);
}
