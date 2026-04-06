import {
  askOpenRouterQuestion,
  listOpenRouterModels,
} from '../src/lib/providers/openrouter';
import {
  getConversationBySnapshotId,
  upsertConversationExchange,
} from '../src/lib/storage/conversations';
import {
  getPageSnapshotById,
  savePageSnapshot,
} from '../src/lib/storage/page-snapshots';
import {
  getExtensionSettings,
  getProviderConfiguration,
} from '../src/lib/storage/settings';
import type { AskQuestionResponse } from '../src/types/chat';
import type {
  ExtractActivePageResponse,
  ExtractedPagePayload,
} from '../src/types/page-context';
import type { ListOpenRouterModelsResponse } from '../src/types/provider-models';
import type { SupportedProvider } from '../src/types/runtime';

const EXTRACTION_TIMEOUT_MS = 45000;
const INJECTED_EXTRACTION_WORLD = 'ISOLATED';

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function isSupportedTabUrl(url: string) {
  return /^(https?:)\/\//.test(url);
}

function isMissingReceiverError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes(
      'Could not establish connection. Receiving end does not exist',
    )
  );
}

async function extractViaInjectedScript(tabId: number) {
  const [result] = await chrome.scripting.executeScript({
    args: [],
    func: () => {
      const textContent =
        document.body?.innerText?.replace(/\s+/g, ' ').trim() ?? '';

      return {
        textContent,
        title: document.title || window.location.hostname,
        url: window.location.href,
      };
    },
    target: { tabId },
    world: INJECTED_EXTRACTION_WORLD,
  });

  const payload = result?.result;

  if (!payload?.textContent) {
    throw new Error('The active page did not expose readable text content.');
  }

  return payload as ExtractedPagePayload;
}

async function requestActivePageExtraction() {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id) {
    throw new Error('No active tab is available for extraction.');
  }

  if (!activeTab.url || !isSupportedTabUrl(activeTab.url)) {
    throw new Error(
      'This page cannot be scanned. Open a regular website tab and try again.',
    );
  }

  try {
    const response = await withTimeout(
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'page-context:extract',
      }),
      EXTRACTION_TIMEOUT_MS,
      'Page scanning timed out. Please try again on a simpler page or refresh the tab.',
    );

    if (!response?.ok) {
      throw new Error(
        response?.error ??
          'The active tab did not return readable page content.',
      );
    }

    return response.payload as ExtractedPagePayload;
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw error;
    }

    console.warn(
      'Content script receiver was missing. Falling back to injected extraction.',
    );

    return withTimeout(
      extractViaInjectedScript(activeTab.id),
      EXTRACTION_TIMEOUT_MS,
      'Page scanning timed out. Please try again on a simpler page or refresh the tab.',
    );
  }
}

async function askGroundedQuestion({
  model,
  provider,
  question,
  snapshotId,
}: {
  model: string;
  provider: SupportedProvider;
  question: string;
  snapshotId: string;
}) {
  const settings = await getExtensionSettings();
  const providerConfiguration = getProviderConfiguration(settings, provider);

  if (!providerConfiguration?.apiKey) {
    throw new Error(
      `No saved API key was found for provider: ${provider}. Re-save the provider setup and try again.`,
    );
  }

  const snapshot = await getPageSnapshotById(snapshotId);

  if (!snapshot) {
    throw new Error('The selected page snapshot could not be found.');
  }

  const existingConversation = await getConversationBySnapshotId(snapshotId);

  let assistantMessage = '';

  if (provider === 'openrouter') {
    assistantMessage = await askOpenRouterQuestion({
      apiKey: providerConfiguration.apiKey,
      conversationMessages: existingConversation?.messages ?? [],
      model,
      snapshot,
      userQuestion: question,
    });
  } else {
    throw new Error('Grounded chat is currently enabled only for OpenRouter.');
  }

  return upsertConversationExchange({
    assistantMessage,
    model,
    provider,
    snapshot,
    userMessage: question,
  });
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.info('Chat With Website installed.');
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'openrouter:list-models') {
      void (async () => {
        try {
          const models = await listOpenRouterModels();

          const response: ListOpenRouterModelsResponse = {
            models,
            ok: true,
          };

          sendResponse(response);
        } catch (error) {
          const response: ListOpenRouterModelsResponse = {
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load the OpenRouter model list.',
            ok: false,
          };

          sendResponse(response);
        }
      })();

      return true;
    }

    if (message?.type === 'chat:ask-question') {
      void (async () => {
        try {
          const result = await askGroundedQuestion(message.payload);

          const response: AskQuestionResponse = {
            conversation: result.conversation,
            messages: result.messages,
            ok: true,
          };

          sendResponse(response);
        } catch (error) {
          console.error('Failed to complete grounded chat request.', error);

          const response: AskQuestionResponse = {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown error while sending the grounded chat request.',
          };

          sendResponse(response);
        }
      })();

      return true;
    }

    if (message?.type !== 'page-context:extract-active-page') {
      return;
    }

    void (async () => {
      try {
        const payload = await requestActivePageExtraction();
        const snapshot = await savePageSnapshot(payload);

        const response: ExtractActivePageResponse = {
          ok: true,
          snapshot,
        };

        sendResponse(response);
      } catch (error) {
        console.error('Failed to extract active page.', error);

        const response: ExtractActivePageResponse = {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error while extracting the active page.',
        };

        sendResponse(response);
      }
    })();

    return true;
  });
});
