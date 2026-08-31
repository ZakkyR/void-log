/// <reference path="../../.wxt/wxt.d.ts" />

import { browser } from 'wxt/browser';
import { StorageClient } from '@/lib/storage';
import { buildCsv, dailyToCsvRows, buildJsonBackup, parseJsonBackup } from '@/lib/csv';
import { getPeriodDateKeys, getLast30DateKeys, getMonthRange, toAggregationDate } from '@/lib/time';
import { hasRequiredHostPermissions, requestRequiredHostPermissions } from '@/lib/permissions';

const storage = new StorageClient(browser.storage.local);

function maskWebhookUrl(url: string): string {
  return url ? '•'.repeat(Math.min(url.length, 24)) : '';
}

async function loadForm() {
  const schema = await storage.read();

  const boundarySelect = document.getElementById('day-boundary-hour') as HTMLSelectElement;
  boundarySelect.innerHTML = '';
  for (let h = 0; h <= 6; h++) {
    const option = document.createElement('option');
    option.value = String(h);
    option.textContent = `${h}時`;
    boundarySelect.appendChild(option);
  }
  boundarySelect.value = String(schema.settings.dayBoundaryHour);

  (document.querySelector(`input[name="week-start"][value="${schema.settings.weekStart}"]`) as HTMLInputElement).checked = true;

  (document.getElementById('display-name') as HTMLInputElement).value = schema.settings.displayName;
  (document.querySelector(`input[name="discord-format"][value="${schema.settings.discordFormat}"]`) as HTMLInputElement).checked = true;

  const webhookInput = document.getElementById('discord-webhook-url') as HTMLInputElement;
  webhookInput.value = schema.settings.discordWebhookUrl;
  webhookInput.placeholder = maskWebhookUrl(schema.settings.discordWebhookUrl);

  (document.getElementById('template-x') as HTMLTextAreaElement).value = schema.settings.templates.x;
  (document.getElementById('template-discord') as HTMLTextAreaElement).value = schema.settings.templates.discord;

  if (!(await hasRequiredHostPermissions())) {
    document.getElementById('permission-banner')!.hidden = false;
  }
}

function bindSave() {
  document.getElementById('save')!.addEventListener('click', async () => {
    const dayBoundaryHour = Number((document.getElementById('day-boundary-hour') as HTMLSelectElement).value);
    const weekStart = (document.querySelector('input[name="week-start"]:checked') as HTMLInputElement).value as 'monday' | 'sunday';
    const displayName = (document.getElementById('display-name') as HTMLInputElement).value;
    const discordFormat = (document.querySelector('input[name="discord-format"]:checked') as HTMLInputElement).value as 'embed' | 'content';
    const discordWebhookUrl = (document.getElementById('discord-webhook-url') as HTMLInputElement).value;
    const templateX = (document.getElementById('template-x') as HTMLTextAreaElement).value;
    const templateDiscord = (document.getElementById('template-discord') as HTMLTextAreaElement).value;

    await storage.updateSettings({
      dayBoundaryHour, weekStart, displayName, discordFormat, discordWebhookUrl,
      templates: { x: templateX, discord: templateDiscord },
    });

    document.getElementById('save-status')!.textContent = '保存しました';
  });
}

function bindPermissionBanner() {
  document.getElementById('grant-permission')!.addEventListener('click', async () => {
    const granted = await requestRequiredHostPermissions();
    if (granted) document.getElementById('permission-banner')!.hidden = true;
  });
}

function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  browser.downloads.download({ url, filename });
}

function bindExportImport() {
  document.getElementById('export-csv')!.addEventListener('click', async () => {
    const schema = await storage.read();
    const period = (document.getElementById('export-period') as HTMLSelectElement).value;
    const todayKey = toAggregationDate(new Date(), schema.settings.dayBoundaryHour);
    const allKeys = Object.keys(schema.daily);
    let keys: string[];
    if (period === 'all') {
      keys = getPeriodDateKeys('total', todayKey, schema.settings.weekStart, allKeys);
    } else if (period === 'last30') {
      keys = getLast30DateKeys(todayKey);
    } else {
      const monthValue = (document.getElementById('export-month') as HTMLInputElement).value;
      keys = monthValue ? getMonthRange(`${monthValue}-01`) : [];
    }
    const csv = buildCsv(dailyToCsvRows(schema.daily, keys));
    const rangeLabel = keys.length
      ? `${keys[0].replace(/-/g, '')}-${keys[keys.length - 1].replace(/-/g, '')}`
      : todayKey.replace(/-/g, '');
    downloadBlob(csv, 'text/csv', `void-log_${rangeLabel}.csv`);
  });

  document.getElementById('export-json')!.addEventListener('click', async () => {
    const schema = await storage.read();
    downloadBlob(buildJsonBackup(schema), 'application/json', `void-log_backup_${schema.runtime.todayDate || 'export'}.json`);
  });

  document.getElementById('import-json')!.addEventListener('change', async (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const schema = parseJsonBackup(text);
      await storage.replaceAll(schema);
      await loadForm();
      document.getElementById('save-status')!.textContent = 'バックアップを取り込みました';
    } catch {
      document.getElementById('save-status')!.textContent = '取り込みに失敗しました（ファイル形式を確認してください）';
    } finally {
      input.value = '';
    }
  });
}

function bindDeleteAll() {
  document.getElementById('delete-all')!.addEventListener('click', async () => {
    if (!confirm('すべてのデータを削除します。よろしいですか？')) return;
    await storage.clearAll();
    await loadForm();
  });
}

async function main() {
  await loadForm();
  bindSave();
  bindPermissionBanner();
  bindExportImport();
  bindDeleteAll();
}

main();
