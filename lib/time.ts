export type Period = 'day' | 'week' | 'month' | 'total';

export function toAggregationDate(date: Date, dayBoundaryHour: number): string {
  const shifted = new Date(date.getTime() - dayBoundaryHour * 60 * 60 * 1000);
  return toDateKey(shifted);
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  let result = '';
  if (h > 0) result += `${h}時間`;
  if (h > 0 || m > 0) result += `${m}分`;
  result += `${sec}秒`;
  return result;
}

export function formatMonthDay(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${m}/${d}`;
}

export function formatDateRangeLabel(startDateKey: string, endDateKey: string): string {
  return `${formatMonthDay(startDateKey)}-${formatMonthDay(endDateKey)}`;
}

export function formatYearMonthLabel(dateKey: string): string {
  const [y, m] = dateKey.split('-').map(Number);
  return `${y}年${m}月`;
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekRange(dateKey: string, weekStart: 'monday' | 'sunday'): string[] {
  const date = parseDateKey(dateKey);
  const jsDay = date.getDay();
  const offsetFromStart = weekStart === 'monday' ? (jsDay + 6) % 7 : jsDay;
  const start = new Date(date);
  start.setDate(date.getDate() - offsetFromStart);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    keys.push(toDateKey(d));
  }
  return keys;
}

export function getMonthRange(dateKey: string): string[] {
  const date = parseDateKey(dateKey);
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const keys: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    keys.push(toDateKey(new Date(year, month, d)));
  }
  return keys;
}

export function getPeriodDateKeys(
  period: Period,
  referenceDateKey: string,
  weekStart: 'monday' | 'sunday',
  allDailyDateKeys: string[],
): string[] {
  switch (period) {
    case 'day':
      return [referenceDateKey];
    case 'week':
      return getWeekRange(referenceDateKey, weekStart);
    case 'month':
      return getMonthRange(referenceDateKey);
    case 'total':
      return [...allDailyDateKeys].sort();
  }
}

export function getLast30DateKeys(referenceDateKey: string): string[] {
  const [y, m, d] = referenceDateKey.split('-').map(Number);
  const keys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    keys.push(toDateKey(new Date(y, m - 1, d - i)));
  }
  return keys;
}

const WEEKDAY_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];

export function getWeekdayLabel(dateKey: string): string {
  return WEEKDAY_LABELS_JA[parseDateKey(dateKey).getDay()];
}
