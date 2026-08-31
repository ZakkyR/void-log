/// <reference path="../../.wxt/wxt.d.ts" />

import { browser } from 'wxt/browser';
import { StorageClient } from '@/lib/storage';
import { aggregate } from '@/lib/aggregation';
import { getPeriodDateKeys, getLast30DateKeys, formatDuration, toAggregationDate, type Period } from '@/lib/time';
import { buildTemplateContext, renderTemplate, truncateForX } from '@/lib/template';
import { buildDiscordPayload } from '@/lib/discord';
import { buildXIntentUrl } from '@/lib/xIntent';
import { buildCsv, dailyToCsvRows } from '@/lib/csv';
import type { AggregatedMetrics, SendDiscordMessage } from '@/lib/types';

interface SendDiscordResponse {
  ok: boolean;
  error?: string;
  status?: number;
}

const PERIOD_LABELS: Record<Period, string> = { day: '今日', week: '今週', month: '今月', total: '累計' };

const storage = new StorageClient(browser.storage.local);

function renderCards(metrics: Record<Period, AggregatedMetrics>) {
  const container = document.getElementById('cards')!;
  container.innerHTML = '';
  (Object.keys(PERIOD_LABELS) as Period[]).forEach((period) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h2>${PERIOD_LABELS[period]}</h2>
      <p>${formatDuration(metrics[period].seconds)}</p>
      <p>${metrics[period].slides}回スライド</p>
    `;
    container.appendChild(card);
  });
}

function renderChart(daily: Record<string, { youtube_shorts?: { seconds: number } }>, dateKeys: string[]) {
  const container = document.getElementById('chart')!;
  container.innerHTML = '';
  const values = dateKeys.map((key) => daily[key]?.youtube_shorts?.seconds ?? 0);
  const max = Math.max(1, ...values);
  dateKeys.forEach((key, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.round((values[i] / max) * 100)}%`;
    bar.title = `${key}: ${formatDuration(values[i])}`;
    container.appendChild(bar);
  });
}

async function main() {
  const schema = await storage.read();
  const todayKey = toAggregationDate(new Date(), schema.settings.dayBoundaryHour);
  const allDateKeys = Object.keys(schema.daily);
  const platforms = schema.settings.enabledPlatforms;

  const metrics: Record<Period, AggregatedMetrics> = {
    day: aggregate(schema.daily, getPeriodDateKeys('day', todayKey, schema.settings.weekStart, allDateKeys), platforms),
    week: aggregate(schema.daily, getPeriodDateKeys('week', todayKey, schema.settings.weekStart, allDateKeys), platforms),
    month: aggregate(schema.daily, getPeriodDateKeys('month', todayKey, schema.settings.weekStart, allDateKeys), platforms),
    total: aggregate(schema.daily, getPeriodDateKeys('total', todayKey, schema.settings.weekStart, allDateKeys), platforms),
  };

  renderCards(metrics);
  renderChart(schema.daily, getLast30DateKeys(todayKey));

  const periodSelect = document.getElementById('period-select') as HTMLSelectElement;
  const statusEl = document.getElementById('status')!;

  function currentContext() {
    const period = periodSelect.value as Period;
    return buildTemplateContext(PERIOD_LABELS[period], metrics[period], metrics.total, formatDuration);
  }

  document.getElementById('post-x')!.addEventListener('click', () => {
    const rendered = renderTemplate(schema.settings.templates.x, currentContext());
    const { text, truncated } = truncateForX(rendered);
    browser.tabs.create({ url: buildXIntentUrl(text) });
    statusEl.textContent = truncated ? '本文が280文字を超えたため切り詰めました' : '';
  });

  document.getElementById('post-discord')!.addEventListener('click', async () => {
    if (!schema.settings.discordWebhookUrl) {
      statusEl.textContent = 'Discord Webhook URL が未設定です';
      return;
    }
    const payload = buildDiscordPayload(
      schema.settings.discordFormat,
      PERIOD_LABELS[periodSelect.value as Period],
      currentContext(),
      schema.settings.templates.discord,
    );
    const response = await browser.runtime.sendMessage<SendDiscordMessage, SendDiscordResponse>({
      type: 'voidlog:sendDiscord',
      webhookUrl: schema.settings.discordWebhookUrl,
      payload,
    });
    statusEl.textContent = response?.ok ? 'Discord に投稿しました' : `送信に失敗しました: ${response?.error ?? response?.status}`;
  });

  document.getElementById('export-csv')!.addEventListener('click', () => {
    const keys = getLast30DateKeys(todayKey);
    const csv = buildCsv(dailyToCsvRows(schema.daily, keys));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    browser.downloads.download({
      url,
      filename: `void-log_${keys[0].replace(/-/g, '')}-${keys[keys.length - 1].replace(/-/g, '')}.csv`,
    });
  });

  document.getElementById('open-options')!.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  });
}

main();
