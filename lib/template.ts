import type { AggregatedMetrics } from './types';

export interface TemplateContext {
  period: string;
  duration: string;
  minutes: number;
  slides: number;
  items: number;
  avgPerItem: number;
  total_duration: string;
  breakdown: string;
}

export function buildTemplateContext(
  periodLabel: string,
  periodMetrics: AggregatedMetrics,
  totalMetrics: AggregatedMetrics,
  formatDurationFn: (seconds: number) => string,
): TemplateContext {
  const avgPerItem = periodMetrics.items > 0 ? Math.round(periodMetrics.seconds / periodMetrics.items) : 0;
  return {
    period: periodLabel,
    duration: formatDurationFn(periodMetrics.seconds),
    minutes: Math.round(periodMetrics.seconds / 60),
    slides: periodMetrics.slides,
    items: periodMetrics.items,
    avgPerItem,
    total_duration: formatDurationFn(totalMetrics.seconds),
    breakdown: 'YouTube Shorts',
  };
}

export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key in context) {
      return String((context as Record<string, unknown>)[key]);
    }
    return match;
  });
}

export function truncateForX(text: string, maxLength = 280): { text: string; truncated: boolean } {
  if (text.length <= maxLength) return { text, truncated: false };
  return { text: text.slice(0, maxLength), truncated: true };
}
