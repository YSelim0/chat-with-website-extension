import { extractPageContext } from '../src/lib/page-context/extract';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== 'page-context:extract') {
        return;
      }

      try {
        sendResponse({
          ok: true,
          payload: extractPageContext(),
        });
      } catch (error) {
        console.error('Failed to extract page context.', error);
        sendResponse({
          ok: false,
          error: 'Failed to extract readable content from the active page.',
        });
      }

      return true;
    });

    console.info(
      'Chat With Website content script ready:',
      window.location.href,
    );
  },
});
