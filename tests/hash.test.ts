import { describe, it, expect } from 'vitest';
import { hashItemId } from '@/lib/hash';

describe('hashItemId', () => {
  it('is deterministic for the same input', () => {
    expect(hashItemId('abc123')).toBe(hashItemId('abc123'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashItemId('abc123')).not.toBe(hashItemId('xyz789'));
  });
});
