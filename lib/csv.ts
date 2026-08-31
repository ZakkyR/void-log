import type { DailyRecord, PlatformId, StorageSchema } from './types';
import { formatDuration, getWeekdayLabel } from './time';

export interface CsvRow {
  date: string;
  weekday: string;
  platform: PlatformId;
  seconds: number;
  durationHms: string;
  slides: number;
  uniqueItems: number;
}

export function dailyToCsvRows(daily: Record<string, DailyRecord>, dateKeys: string[]): CsvRow[] {
  const rows: CsvRow[] = [];
  for (const dateKey of dateKeys) {
    const record = daily[dateKey];
    if (!record) continue;
    for (const platform of Object.keys(record) as PlatformId[]) {
      const metrics = record[platform];
      if (!metrics) continue;
      rows.push({
        date: dateKey,
        weekday: getWeekdayLabel(dateKey),
        platform,
        seconds: metrics.seconds,
        durationHms: formatDuration(metrics.seconds),
        slides: metrics.slides,
        uniqueItems: metrics.items,
      });
    }
  }
  return rows;
}

const CSV_HEADER = 'date,weekday,platform,seconds,duration_hhmmss,slides,unique_items';

export function buildCsv(rows: CsvRow[]): string {
  const lines = [CSV_HEADER];
  for (const row of rows) {
    lines.push([row.date, row.weekday, row.platform, row.seconds, row.durationHms, row.slides, row.uniqueItems].join(','));
  }
  const BOM = '﻿';
  return BOM + lines.join('\r\n') + '\r\n';
}

export function buildJsonBackup(schema: StorageSchema): string {
  return JSON.stringify(schema, null, 2);
}

export function parseJsonBackup(json: string): StorageSchema {
  const parsed = JSON.parse(json) as Partial<StorageSchema>;
  if (typeof parsed.schemaVersion !== 'number' || typeof parsed.daily !== 'object' || typeof parsed.settings !== 'object') {
    throw new Error('Invalid backup file format');
  }
  return parsed as StorageSchema;
}
