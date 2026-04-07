import { describe, expect, it } from 'vitest';

import { chunkPageText } from './chunking';

describe('chunkPageText', () => {
  it('returns an empty array for blank input', () => {
    expect(chunkPageText('   \n   ')).toEqual([]);
  });

  it('normalizes whitespace before chunking', () => {
    const [firstChunk] = chunkPageText('hello\n\nworld   from   page');

    expect(firstChunk?.content).toBe('hello world from page');
  });

  it('creates multiple ordered chunks for long content', () => {
    const longText = Array.from({ length: 500 }, () => 'grounded-content').join(
      ' ',
    );
    const chunks = chunkPageText(longText);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.id).toBe('chunk-1');
    expect(chunks[1]?.order).toBe(1);
    expect(chunks.every((chunk) => chunk.content.length > 0)).toBe(true);
  });
});
