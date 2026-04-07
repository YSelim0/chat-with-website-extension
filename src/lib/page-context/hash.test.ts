import { describe, expect, it } from 'vitest';

import { createContentHash } from './hash';

describe('createContentHash', () => {
  it('returns the same hash for identical input', () => {
    expect(createContentHash('same content')).toBe(
      createContentHash('same content'),
    );
  });

  it('returns different hashes for different input', () => {
    expect(createContentHash('alpha')).not.toBe(createContentHash('beta'));
  });
});
