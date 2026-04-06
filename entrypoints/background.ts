import { savePageSnapshot } from '../src/lib/storage/page-snapshots';
import type {
  ExtractActivePageResponse,
  ExtractedPagePayload,
} from '../src/types/page-context';

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

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.info('Chat With Website installed.');
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
