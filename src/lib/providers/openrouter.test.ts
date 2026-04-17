import { beforeEach, describe, expect, it, vi } from 'vitest';

import { askOpenRouterQuestion, listOpenRouterModels } from './openrouter';

const snapshot = {
  chunks: [
    {
      content: 'This page says the product is available on weekdays.',
      id: 'chunk-1',
      order: 0,
    },
  ],
  contentHash: 'hash',
  extractedAt: '2025-01-01T00:00:00.000Z',
  hostname: 'example.com',
  id: 'snapshot-1',
  textLength: 55,
  title: 'Example',
  url: 'https://example.com',
} as const;

describe('openrouter provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes and sorts the OpenRouter model list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [
              {
                description: 'Paid model',
                id: 'openai/gpt-4.1-mini',
                name: 'GPT 4.1 Mini',
                pricing: { completion: '1', prompt: '1' },
              },
              {
                description: 'Free model',
                id: 'qwen/qwen3.6-plus:free',
                name: 'Qwen 3.6 Plus',
                pricing: { completion: '0', prompt: '0' },
              },
            ],
          }),
      }),
    );

    const models = await listOpenRouterModels();

    expect(models[0]?.id).toBe('qwen/qwen3.6-plus:free');
    expect(models[0]?.isFree).toBe(true);
    expect(models[1]?.providerName).toBe('openai');
  });

  it('surfaces rate-limit errors with provider detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () =>
          JSON.stringify({
            error: {
              code: 429,
              metadata: {
                raw: 'qwen/qwen3.6-plus:free is temporarily rate-limited upstream.',
              },
              message: 'Provider returned error',
            },
          }),
      }),
    );

    await expect(
      askOpenRouterQuestion({
        apiKey: 'test-key',
        conversationMessages: [],
        model: 'qwen/qwen3.6-plus:free',
        snapshot,
        userQuestion: 'When is it available?',
      }),
    ).rejects.toThrow('rate-limited upstream');
  });

  it('returns the assistant content for successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: 'It is available on weekdays.' } }],
          }),
      }),
    );

    const response = await askOpenRouterQuestion({
      apiKey: 'test-key',
      conversationMessages: [],
      model: 'qwen/qwen3.6-plus:free',
      snapshot,
      userQuestion: 'When is it available?',
    });

    expect(response).toBe('It is available on weekdays.');
  });
});
