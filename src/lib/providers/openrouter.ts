import type { ConversationMessage } from '../../types/chat';
import type { PageSnapshot } from '../../types/page-context';
import type { ProviderModelSummary } from '../../types/provider-models';
import { buildGroundedMessages } from '../chat/prompt';

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    metadata?: {
      raw?: string;
      provider_name?: string;
    };
  };
};

type OpenRouterModelsResponse = {
  data?: Array<{
    description?: string;
    id?: string;
    name?: string;
    pricing?: {
      completion?: number | string;
      prompt?: number | string;
    };
    top_provider?: {
      context_length?: number;
    };
  }>;
};

function parseResponsePayload(responseText: string) {
  try {
    return JSON.parse(responseText) as OpenRouterChatResponse;
  } catch {
    return null;
  }
}

function parseNumericPrice(value: number | string | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

function normalizeModel(model: OpenRouterModelsResponse['data'][number]) {
  const id = typeof model?.id === 'string' ? model.id : null;

  if (!id) {
    return null;
  }

  const promptPrice = parseNumericPrice(model.pricing?.prompt);
  const completionPrice = parseNumericPrice(model.pricing?.completion);
  const isFree =
    id.includes(':free') || (promptPrice === 0 && completionPrice === 0);
  const providerName = id.split('/')[0];
  const contextLength = model.top_provider?.context_length;
  const contextLabel =
    typeof contextLength === 'number' && contextLength > 0
      ? `Context ${contextLength.toLocaleString()}`
      : null;

  return {
    description:
      model.description?.trim() ||
      [isFree ? 'Free tier model' : null, contextLabel]
        .filter(Boolean)
        .join(' · ') ||
      'OpenRouter model',
    id,
    isFree,
    label: typeof model.name === 'string' ? model.name : id,
    providerName,
  } satisfies ProviderModelSummary;
}

function sortModels(left: ProviderModelSummary, right: ProviderModelSummary) {
  const preferredModelId = 'qwen/qwen3.6-plus:free';

  if (left.id === preferredModelId) {
    return -1;
  }

  if (right.id === preferredModelId) {
    return 1;
  }

  if (left.isFree && !right.isFree) {
    return -1;
  }

  if (!left.isFree && right.isFree) {
    return 1;
  }

  return left.label.localeCompare(right.label);
}

export async function listOpenRouterModels() {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenRouter model listing failed with status ${response.status}.`,
    );
  }

  let payload: OpenRouterModelsResponse;

  try {
    payload = JSON.parse(responseText) as OpenRouterModelsResponse;
  } catch {
    throw new Error('OpenRouter returned an unreadable model list response.');
  }

  const models = (payload.data ?? [])
    .map(normalizeModel)
    .filter((model): model is ProviderModelSummary => Boolean(model))
    .sort(sortModels);

  if (models.length === 0) {
    throw new Error('OpenRouter did not return any usable models.');
  }

  return models;
}

export async function askOpenRouterQuestion({
  apiKey,
  conversationMessages,
  model,
  snapshot,
  userQuestion,
}: {
  apiKey: string;
  conversationMessages: ConversationMessage[];
  model: string;
  snapshot: PageSnapshot;
  userQuestion: string;
}) {
  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      body: JSON.stringify({
        messages: buildGroundedMessages(
          snapshot,
          conversationMessages,
          userQuestion,
        ),
        model,
        reasoning: {
          enabled: true,
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );

  const responseText = await response.text();
  const payload = parseResponsePayload(responseText);

  if (!response.ok) {
    const providerError = payload?.error;
    const detailedMessage =
      providerError?.metadata?.raw || providerError?.message || responseText;
    const statusPrefix = providerError?.code
      ? `OpenRouter error ${providerError.code}`
      : `OpenRouter error ${response.status}`;

    throw new Error(
      `${statusPrefix}: ${detailedMessage || 'OpenRouter rejected the grounded chat request.'}`,
    );
  }

  const assistantContent = payload?.choices?.[0]?.message?.content?.trim();

  if (!assistantContent) {
    throw new Error('OpenRouter returned an empty assistant response.');
  }

  return assistantContent;
}
