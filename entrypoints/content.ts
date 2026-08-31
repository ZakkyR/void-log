/// <reference path="../.wxt/wxt.d.ts" />

import { browser } from 'wxt/browser';
import { adapters } from '@/lib/adapters/registry';
import { MeasurementEngine } from '@/lib/engine/measurementEngine';
import { StorageClient } from '@/lib/storage';
import { toAggregationDate } from '@/lib/time';
import { hashItemId } from '@/lib/hash';
import type { FlushMessage } from '@/lib/types';

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  runAt: 'document_idle',
  main() {
    const adapter = adapters[0];
    const storage = new StorageClient(browser.storage.local);

    let dayBoundaryHour = 0;
    storage.read().then((schema) => {
      dayBoundaryHour = schema.settings.dayBoundaryHour;
    });

    let accumulatedSeconds = 0;
    let accumulatedSlides = 0;
    const itemHashes = new Set<string>();
    let engine: MeasurementEngine | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    function flush() {
      const seconds = Math.floor(accumulatedSeconds);
      if (seconds <= 0 && accumulatedSlides === 0 && itemHashes.size === 0) return;
      accumulatedSeconds -= seconds;
      const message: FlushMessage = {
        type: 'voidlog:flush',
        platform: adapter.id,
        dateKey: toAggregationDate(new Date(), dayBoundaryHour),
        seconds,
        slides: accumulatedSlides,
        itemHashes: Array.from(itemHashes),
      };
      accumulatedSlides = 0;
      itemHashes.clear();
      browser.runtime.sendMessage(message).catch(() => {});
    }

    function evaluateActivation() {
      const active = adapter.isActivePage();
      if (active && !engine) {
        engine = new MeasurementEngine(
          {
            adapter,
            now: () => performance.now(),
            isDocumentVisible: () => document.visibilityState === 'visible',
            isWindowFocused: () => document.hasFocus(),
          },
          {
            onSecondsTick: (delta) => { accumulatedSeconds += delta; },
            onSlide: () => { accumulatedSlides += 1; },
            onItemChange: (id) => { itemHashes.add(hashItemId(id)); },
          },
        );
        engine.start();
        flushTimer = setInterval(flush, 5000);
      } else if (!active && engine) {
        engine.stop();
        engine = null;
        if (flushTimer) {
          clearInterval(flushTimer);
          flushTimer = null;
        }
        flush();
      } else if (active && engine) {
        engine.checkItem();
      }
    }

    evaluateActivation();
    adapter.subscribeNavigation(evaluateActivation);
  },
});
