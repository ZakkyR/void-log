import { describe, it, expect, beforeEach } from 'vitest';
import { StorageClient, DEFAULT_SETTINGS, type StorageArea } from '@/lib/storage';

function createFakeArea(): StorageArea {
  const data: Record<string, unknown> = {};
  return {
    async get(keys: string[]) {
      const result: Record<string, unknown> = {};
      for (const key of keys) if (key in data) result[key] = data[key];
      return result;
    },
    async set(items: Record<string, unknown>) {
      Object.assign(data, items);
    },
    async remove(keys: string[]) {
      for (const key of keys) delete data[key];
    },
  };
}

describe('StorageClient', () => {
  let client: StorageClient;

  beforeEach(() => {
    client = new StorageClient(createFakeArea());
  });

  it('returns default settings when nothing is stored', async () => {
    const schema = await client.read();
    expect(schema.settings).toEqual(DEFAULT_SETTINGS);
    expect(schema.daily).toEqual({});
  });

  it('accumulates seconds, slides, and unique items for a platform/date', async () => {
    await client.addMeasurement({
      platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 5, deltaSlides: 1, itemHashes: ['a', 'b'],
    });
    await client.addMeasurement({
      platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 5, deltaSlides: 1, itemHashes: ['b', 'c'],
    });
    const schema = await client.read();
    expect(schema.daily['2026-08-30'].youtube_shorts).toEqual({ seconds: 10, slides: 2, items: 3 });
  });

  it('resets the unique-item set when the date changes', async () => {
    await client.addMeasurement({
      platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 1, deltaSlides: 0, itemHashes: ['a'],
    });
    await client.addMeasurement({
      platform: 'youtube_shorts', dateKey: '2026-08-31', deltaSeconds: 1, deltaSlides: 0, itemHashes: ['a'],
    });
    const schema = await client.read();
    expect(schema.daily['2026-08-31'].youtube_shorts?.items).toBe(1);
  });

  it('updates settings via a partial patch without discarding other fields', async () => {
    await client.updateSettings({ dayBoundaryHour: 4 });
    const schema = await client.read();
    expect(schema.settings.dayBoundaryHour).toBe(4);
    expect(schema.settings.weekStart).toBe(DEFAULT_SETTINGS.weekStart);
  });

  it('clears all stored data', async () => {
    await client.addMeasurement({
      platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 1, deltaSlides: 0, itemHashes: [],
    });
    await client.clearAll();
    const schema = await client.read();
    expect(schema.daily).toEqual({});
    expect(schema.settings).toEqual(DEFAULT_SETTINGS);
  });
});
