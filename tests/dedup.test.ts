import { describe, it, expect } from 'vitest';
import { shouldAcceptFlush } from '@/lib/dedup';

describe('shouldAcceptFlush', () => {
  it('accepts the first flush when there is no previous state', () => {
    expect(shouldAcceptFlush(null, { tabId: 1, timestampMs: 1000 })).toBe(true);
  });

  it('accepts a later flush from a different tab in a different second', () => {
    expect(shouldAcceptFlush({ tabId: 1, timestampMs: 1000 }, { tabId: 2, timestampMs: 2500 })).toBe(true);
  });

  it('rejects a flush from a different tab within the same second', () => {
    expect(shouldAcceptFlush({ tabId: 1, timestampMs: 1000 }, { tabId: 2, timestampMs: 1200 })).toBe(false);
  });

  it('accepts a flush from the same tab even within the same second', () => {
    expect(shouldAcceptFlush({ tabId: 1, timestampMs: 1000 }, { tabId: 1, timestampMs: 1200 })).toBe(true);
  });
});
