import { describe, it, expect } from 'vitest';
import { aggregate } from '@/lib/aggregation';
import type { DailyRecord } from '@/lib/types';

const daily: Record<string, DailyRecord> = {
  '2026-08-29': { youtube_shorts: { seconds: 100, slides: 10, items: 5 } },
  '2026-08-30': { youtube_shorts: { seconds: 200, slides: 20, items: 8 } },
};

describe('aggregate', () => {
  it('sums metrics across the given date keys for enabled platforms', () => {
    const result = aggregate(daily, ['2026-08-29', '2026-08-30'], ['youtube_shorts']);
    expect(result.seconds).toBe(300);
    expect(result.slides).toBe(30);
    expect(result.items).toBe(13);
    expect(result.byPlatform.youtube_shorts).toEqual({ seconds: 300, slides: 30, items: 13 });
  });

  it('treats missing dates as zero', () => {
    const result = aggregate(daily, ['2026-08-01', '2026-08-30'], ['youtube_shorts']);
    expect(result.seconds).toBe(200);
  });

  it('ignores platforms that are not requested', () => {
    const result = aggregate(daily, ['2026-08-30'], ['tiktok']);
    expect(result.seconds).toBe(0);
  });
});
