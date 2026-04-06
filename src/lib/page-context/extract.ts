import { Readability } from '@mozilla/readability';

import type { ExtractedPagePayload } from '../../types/page-context';

function collectFallbackText() {
  return document.body?.innerText?.replace(/\s+/g, ' ').trim() ?? '';
}

export function extractPageContext(): ExtractedPagePayload {
  const clonedDocument = document.cloneNode(true) as Document;
  const article = new Readability(clonedDocument).parse();
  const title =
    article?.title?.trim() || document.title || window.location.hostname;
  const textContent =
    article?.textContent?.replace(/\s+/g, ' ').trim() || collectFallbackText();

  return {
    title,
    textContent,
    url: window.location.href,
  };
}
