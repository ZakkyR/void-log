import { describe, it, expect } from 'vitest';
import { buildTemplateContext, renderTemplate, truncateForX } from '@/lib/template';
import { formatDuration } from '@/lib/time';
import type { AggregatedMetrics } from '@/lib/types';

const periodMetrics: AggregatedMetrics = { seconds: 4235, slides: 412, items: 268, byPlatform: {} };
const totalMetrics: AggregatedMetrics = { seconds: 36000, slides: 3000, items: 1000, byPlatform: {} };

describe('buildTemplateContext', () => {
  it('computes derived fields', () => {
    const context = buildTemplateContext('2026-08-30', '8/30', periodMetrics, totalMetrics, formatDuration, '');
    expect(context.minutes).toBe(71);
    expect(context.avgPerItem).toBe(16);
    expect(context.duration).toBe(formatDuration(4235));
    expect(context.total_duration).toBe(formatDuration(36000));
    expect(context.date).toBe('8/30');
  });

  it('uses the anonymous name_line when displayName is empty', () => {
    const context = buildTemplateContext('2026-08-30', '8/30', periodMetrics, totalMetrics, formatDuration, '');
    expect(context.name_line).toBe('私は以下の虚無な時間を過ごしてしまいました。');
  });

  it('includes displayName in name_line when set', () => {
    const context = buildTemplateContext('2026-08-30', '8/30', periodMetrics, totalMetrics, formatDuration, 'ざっきー');
    expect(context.name_line).toBe('私、ざっきーは以下の虚無な時間を過ごしてしまいました。');
  });
});

describe('renderTemplate', () => {
  it('replaces known placeholders', () => {
    const context = buildTemplateContext('2026-08-30', '8/30', periodMetrics, totalMetrics, formatDuration, '');
    const result = renderTemplate('視聴時間: {duration} / スライド: {slides}回', context);
    expect(result).toBe(`視聴時間: ${context.duration} / スライド: 412回`);
  });

  it('leaves unknown placeholders untouched', () => {
    const context = buildTemplateContext('2026-08-30', '8/30', periodMetrics, totalMetrics, formatDuration, '');
    expect(renderTemplate('{unknown}', context)).toBe('{unknown}');
  });
});

describe('truncateForX', () => {
  it('does not truncate short text', () => {
    expect(truncateForX('short')).toEqual({ text: 'short', truncated: false });
  });

  it('truncates text longer than 280 characters', () => {
    const long = 'a'.repeat(300);
    const result = truncateForX(long);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBe(280);
  });
});
