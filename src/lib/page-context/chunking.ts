import type { PageChunk } from '../../types/page-context';

const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 200;

export function chunkPageText(textContent: string) {
  const normalizedText = textContent.replace(/\s+/g, ' ').trim();

  if (!normalizedText) {
    return [] satisfies PageChunk[];
  }

  const chunks: PageChunk[] = [];
  let start = 0;
  let order = 0;

  while (start < normalizedText.length) {
    const end = Math.min(start + CHUNK_SIZE, normalizedText.length);
    const content = normalizedText.slice(start, end).trim();

    if (content) {
      chunks.push({
        id: `chunk-${order + 1}`,
        content,
        order,
      });
    }

    if (end >= normalizedText.length) {
      break;
    }

    start = Math.max(end - CHUNK_OVERLAP, start + 1);
    order += 1;
  }

  return chunks;
}
