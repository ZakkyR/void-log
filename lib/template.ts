import type { AggregatedMetrics } from './types';

export interface TemplateContext {
  period: string;
  date: string;
  duration: string;
  minutes: number;
  slides: number;
  items: number;
  avgPerItem: number;
  total_duration: string;
  breakdown: string;
  name_line: string;
}

export function buildTemplateContext(
  periodLabel: string,
  dateLabel: string,
  periodMetrics: AggregatedMetrics,
  totalMetrics: AggregatedMetrics,
  formatDurationFn: (seconds: number) => string,
  displayName: string,
): TemplateContext {
  const avgPerItem = periodMetrics.items > 0 ? Math.round(periodMetrics.seconds / periodMetrics.items) : 0;
  const nameLine = displayName
    ? `私、${displayName}は以下の虚無な時間を過ごしてしまいました。`
    : '私は以下の虚無な時間を過ごしてしまいました。';
  return {
    period: periodLabel,
    date: dateLabel,
    duration: formatDurationFn(periodMetrics.seconds),
    minutes: Math.round(periodMetrics.seconds / 60),
    slides: periodMetrics.slides,
    items: periodMetrics.items,
    avgPerItem,
    total_duration: formatDurationFn(totalMetrics.seconds),
    breakdown: 'YouTube Shorts',
    name_line: nameLine,
  };
}

export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key in context) {
      return String((context as unknown as Record<string, unknown>)[key]);
    }
    return match;
  });
}

export function truncateForX(text: string, maxLength = 280): { text: string; truncated: boolean } {
  if (text.length <= maxLength) return { text, truncated: false };
  return { text: text.slice(0, maxLength), truncated: true };
}
