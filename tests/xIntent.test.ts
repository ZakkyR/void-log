import { describe, it, expect } from 'vitest';
import { buildXIntentUrl } from '@/lib/xIntent';

describe('buildXIntentUrl', () => {
  it('URL-encodes the text into the intent URL', () => {
    const url = buildXIntentUrl('懺悔 #テスト');
    expect(url).toBe(`https://x.com/intent/post?text=${encodeURIComponent('懺悔 #テスト')}`);
  });
});
