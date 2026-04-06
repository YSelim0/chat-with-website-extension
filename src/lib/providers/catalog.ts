import type { ProviderModelSummary } from '../../types/provider-models';
import type { SupportedProvider } from '../../types/runtime';

export type ModelDefinition = ProviderModelSummary;

export type ProviderDefinition = {
  id: SupportedProvider;
  label: string;
  description: string;
  keyPlaceholder: string;
  keyHint: string;
  models: ModelDefinition[];
};

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Best for general grounded chat on current website content.',
    keyPlaceholder: 'sk-********************************',
    keyHint: 'Uses your local API key stored in extension storage.',
    models: [
      {
        id: 'gpt-4.1-mini',
        label: 'gpt-4.1-mini',
        description: 'A fast default for grounded summaries and follow-up Q&A.',
      },
      {
        id: 'gpt-4.1',
        label: 'gpt-4.1',
        description: 'Stronger reasoning for complex website questions.',
      },
      {
        id: 'gpt-4o',
        label: 'gpt-4o',
        description: 'Balanced multimodal-capable model for future expansion.',
      },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Google models for site-grounded conversations and summaries.',
    keyPlaceholder: 'AIza********************************',
    keyHint:
      'Use a Gemini API key from Google AI Studio or supported Google setup.',
    models: [
      {
        id: 'gemini-2.5-flash',
        label: 'gemini-2.5-flash',
        description: 'Fast and practical default for page-grounded chats.',
      },
      {
        id: 'gemini-2.5-pro',
        label: 'gemini-2.5-pro',
        description: 'Stronger reasoning for longer or denser pages.',
      },
    ],
  },
  {
    id: 'claude',
    label: 'Claude',
    description:
      'Anthropic models with a focused provider-specific setup path.',
    keyPlaceholder: 'sk-ant-********************************',
    keyHint: 'Stored only on this device unless you remove the extension data.',
    models: [
      {
        id: 'claude-3-5-haiku-latest',
        label: 'claude-3-5-haiku-latest',
        description: 'Fast default for concise grounded answers.',
      },
      {
        id: 'claude-3-7-sonnet-latest',
        label: 'claude-3-7-sonnet-latest',
        description: 'Higher quality reasoning for detailed page analysis.',
      },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Fast responses with OpenAI-compatible request semantics.',
    keyPlaceholder: 'gsk_********************************',
    keyHint: 'Good fit for fast retrieval-based question answering.',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        label: 'llama-3.3-70b-versatile',
        description: 'Balanced default for general page-grounded chatting.',
      },
      {
        id: 'qwen/qwen3-32b',
        label: 'qwen/qwen3-32b',
        description: 'Alternative for stronger coding and technical docs.',
      },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Access multiple models through one provider and one key.',
    keyPlaceholder: 'sk-or-v1-********************************',
    keyHint:
      'A flexible choice if you want one integration point for many models.',
    models: [
      {
        id: 'qwen/qwen3.6-plus:free',
        isFree: true,
        label: 'qwen/qwen3.6-plus:free',
        description:
          'Free default for grounded Q&A through OpenRouter with reasoning enabled.',
        providerName: 'Alibaba',
      },
      {
        id: 'openai/gpt-4.1-mini',
        label: 'openai/gpt-4.1-mini',
        description: 'Fast fallback model for lighter page summaries.',
        providerName: 'OpenAI',
      },
      {
        id: 'anthropic/claude-3.7-sonnet',
        label: 'anthropic/claude-3.7-sonnet',
        description: 'Higher quality reasoning when the page content is dense.',
        providerName: 'Anthropic',
      },
    ],
  },
];

export function getProviderDefinition(providerId: SupportedProvider) {
  return PROVIDERS.find((provider) => provider.id === providerId);
}

export function getDefaultModelForProvider(providerId: SupportedProvider) {
  return getProviderDefinition(providerId)?.models[0] ?? null;
}
