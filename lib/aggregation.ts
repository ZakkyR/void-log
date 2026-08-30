import type { AggregatedMetrics, DailyRecord, PlatformId } from './types';

export function aggregate(
  daily: Record<string, DailyRecord>,
  dateKeys: string[],
  platforms: PlatformId[],
): AggregatedMetrics {
  const result: AggregatedMetrics = { seconds: 0, slides: 0, items: 0, byPlatform: {} };
  for (const dateKey of dateKeys) {
    const record = daily[dateKey];
    if (!record) continue;
    for (const platform of platforms) {
      const metrics = record[platform];
      if (!metrics) continue;
      const acc = result.byPlatform[platform] ?? { seconds: 0, slides: 0, items: 0 };
      result.byPlatform[platform] = {
        seconds: acc.seconds + metrics.seconds,
        slides: acc.slides + metrics.slides,
        items: acc.items + metrics.items,
      };
      result.seconds += metrics.seconds;
      result.slides += metrics.slides;
      result.items += metrics.items;
    }
  }
  return result;
}
