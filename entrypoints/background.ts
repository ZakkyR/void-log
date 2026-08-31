/// <reference path="../.wxt/wxt.d.ts" />

import { browser, type Runtime } from 'wxt/browser';
import { StorageClient } from '@/lib/storage';
import { shouldAcceptFlush, type FlushGuardState } from '@/lib/dedup';
import type { VoidLogMessage } from '@/lib/types';

export default defineBackground(() => {
  const storage = new StorageClient(browser.storage.local);
  let lastFlush: FlushGuardState | null = null;

  browser.runtime.onMessage.addListener((raw: unknown, sender: Runtime.MessageSender) => {
    const message = raw as VoidLogMessage;
    if (message.type === 'voidlog:flush') {
      const tabId = sender.tab?.id ?? -1;
      const now = Date.now();
      if (!shouldAcceptFlush(lastFlush, { tabId, timestampMs: now })) {
        return Promise.resolve({ ok: false, reason: 'duplicate' });
      }
      lastFlush = { tabId, timestampMs: now };
      return storage
        .addMeasurement({
          platform: message.platform,
          dateKey: message.dateKey,
          deltaSeconds: message.seconds,
          deltaSlides: message.slides,
          itemHashes: message.itemHashes,
        })
        .then(() => ({ ok: true }));
    }

    if (message.type === 'voidlog:sendDiscord') {
      return sendDiscordWebhook(message.webhookUrl, message.payload);
    }

    return undefined;
  });
});

async function sendDiscordWebhook(webhookUrl: string, payload: unknown) {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.status === 204, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
