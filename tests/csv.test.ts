import { describe, it, expect } from 'vitest';
import { buildCsv, dailyToCsvRows, buildJsonBackup, parseJsonBackup } from '@/lib/csv';
import type { DailyRecord, StorageSchema } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/storage';

const daily: Record<string, DailyRecord> = {
  '2026-08-30': { youtube_shorts: { seconds: 4235, slides: 412, items: 268 } },
};

describe('dailyToCsvRows', () => {
  it('produces one row per platform per date', () => {
    const rows = dailyToCsvRows(daily, ['2026-08-30']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: '2026-08-30', platform: 'youtube_shorts', seconds: 4235, slides: 412, uniqueItems: 268,
    });
  });
});

describe('buildCsv', () => {
  it('includes a UTF-8 BOM, header, and CRLF line endings', () => {
    const rows = dailyToCsvRows(daily, ['2026-08-30']);
    const csv = buildCsv(rows);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('date,weekday,platform,seconds,duration_hhmmss,slides,unique_items\r\n');
    expect(csv).toContain('2026-08-30,日,youtube_shorts,4235,');
  });
});

describe('JSON backup', () => {
  it('round-trips a storage schema', () => {
    const schema: StorageSchema = {
      schemaVersion: 1,
      settings: DEFAULT_SETTINGS,
      daily,
      runtime: { todayDate: '2026-08-30', todayItemIds: {} },
    };
    const json = buildJsonBackup(schema);
    expect(parseJsonBackup(json)).toEqual(schema);
  });

  it('rejects invalid backup files', () => {
    expect(() => parseJsonBackup('{}')).toThrow('Invalid backup file format');
  });
});
