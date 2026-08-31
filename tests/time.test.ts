import { describe, it, expect } from 'vitest';
import {
  toAggregationDate,
  formatDuration,
  formatMonthDay,
  formatDateRangeLabel,
  formatYearMonthLabel,
  getWeekRange,
  getMonthRange,
  getPeriodDateKeys,
  getLast30DateKeys,
  getWeekdayLabel,
} from '@/lib/time';

describe('formatMonthDay', () => {
  it('formats a date key as M/D without zero padding', () => {
    expect(formatMonthDay('2026-08-30')).toBe('8/30');
    expect(formatMonthDay('2026-01-05')).toBe('1/5');
  });
});

describe('formatDateRangeLabel', () => {
  it('formats a start and end date key as M/D-M/D', () => {
    expect(formatDateRangeLabel('2026-08-24', '2026-08-30')).toBe('8/24-8/30');
  });
});

describe('formatYearMonthLabel', () => {
  it('formats a date key as YYYY年M月', () => {
    expect(formatYearMonthLabel('2026-08-30')).toBe('2026年8月');
  });
});

describe('toAggregationDate', () => {
  it('keeps the same calendar day when the boundary offset is 0', () => {
    const date = new Date(2026, 7, 30, 2, 0, 0);
    expect(toAggregationDate(date, 0)).toBe('2026-08-30');
  });

  it('rolls back to the previous day when still within the offset window', () => {
    const date = new Date(2026, 7, 30, 2, 0, 0);
    expect(toAggregationDate(date, 4)).toBe('2026-08-29');
  });

  it('rolls back across month boundary', () => {
    const date = new Date(2026, 8, 1, 2, 0, 0); // 2026-09-01 02:00
    expect(toAggregationDate(date, 4)).toBe('2026-08-31');
  });

  it('rolls back across year boundary', () => {
    const date = new Date(2027, 0, 1, 1, 0, 0); // 2027-01-01 01:00
    expect(toAggregationDate(date, 4)).toBe('2026-12-31');
  });
});

describe('formatDuration', () => {
  it('formats hours, minutes, and seconds in Japanese', () => {
    expect(formatDuration(4235)).toBe('1時間10分35秒');
  });

  it('omits the hour segment when under an hour', () => {
    expect(formatDuration(125)).toBe('2分5秒');
  });

  it('shows only seconds when under a minute', () => {
    expect(formatDuration(9)).toBe('9秒');
  });
});

describe('getWeekRange', () => {
  it('returns Monday through Sunday when weekStart is monday', () => {
    expect(getWeekRange('2026-08-30', 'monday')).toEqual([
      '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
      '2026-08-28', '2026-08-29', '2026-08-30',
    ]);
  });

  it('returns Sunday through Saturday when weekStart is sunday', () => {
    expect(getWeekRange('2026-08-30', 'sunday')).toEqual([
      '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02',
      '2026-09-03', '2026-09-04', '2026-09-05',
    ]);
  });
});

describe('getMonthRange', () => {
  it('returns every date key in the month', () => {
    const range = getMonthRange('2026-08-15');
    expect(range[0]).toBe('2026-08-01');
    expect(range[range.length - 1]).toBe('2026-08-31');
    expect(range).toHaveLength(31);
  });

  it('handles 30-day months correctly', () => {
    const range = getMonthRange('2026-04-15');
    expect(range[0]).toBe('2026-04-01');
    expect(range[range.length - 1]).toBe('2026-04-30');
    expect(range).toHaveLength(30);
  });

  it('handles February in a non-leap year (28 days)', () => {
    const range = getMonthRange('2026-02-10');
    expect(range[0]).toBe('2026-02-01');
    expect(range[range.length - 1]).toBe('2026-02-28');
    expect(range).toHaveLength(28);
  });

  it('handles February in a leap year (29 days)', () => {
    const range = getMonthRange('2028-02-10');
    expect(range[0]).toBe('2028-02-01');
    expect(range[range.length - 1]).toBe('2028-02-29');
    expect(range).toHaveLength(29);
  });
});

describe('getPeriodDateKeys', () => {
  it('returns all known dates sorted for the total period', () => {
    const keys = getPeriodDateKeys('total', '2026-08-30', 'monday', ['2026-08-05', '2026-08-01']);
    expect(keys).toEqual(['2026-08-01', '2026-08-05']);
  });

  it('returns only reference date for day period', () => {
    const keys = getPeriodDateKeys('day', '2026-08-30', 'monday', ['2026-08-05', '2026-08-01']);
    expect(keys).toEqual(['2026-08-30']);
  });

  it('returns week range when week period is specified', () => {
    const keys = getPeriodDateKeys('week', '2026-08-30', 'monday', []);
    const expectedWeek = getWeekRange('2026-08-30', 'monday');
    expect(keys).toEqual(expectedWeek);
  });

  it('returns month range when month period is specified', () => {
    const keys = getPeriodDateKeys('month', '2026-08-30', 'monday', []);
    const expectedMonth = getMonthRange('2026-08-30');
    expect(keys).toEqual(expectedMonth);
  });
});

describe('getLast30DateKeys', () => {
  it('returns 30 consecutive date keys ending at the reference date', () => {
    const keys = getLast30DateKeys('2026-08-30');
    expect(keys).toHaveLength(30);
    expect(keys[0]).toBe('2026-08-01');
    expect(keys[29]).toBe('2026-08-30');
  });
});

describe('getWeekdayLabel', () => {
  it('returns the Japanese weekday letter', () => {
    expect(getWeekdayLabel('2026-08-30')).toBe('日');
    expect(getWeekdayLabel('2026-08-24')).toBe('月');
  });
});
