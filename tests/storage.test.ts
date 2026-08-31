import { describe, it, expect, beforeEach } from 'vitest';
import { StorageClient, DEFAULT_SETTINGS, type StorageArea } from '@/lib/storage';

function createFakeArea(options?: { failSetOnCall?: number }): StorageArea {
  const data: Record<string, unknown> = {};
  let setCallCount = 0;
  return {
    async get(keys: string[]) {
      const result: Record<string, unknown> = {};
      for (const key of keys) if (key in data) result[key] = data[key];
      return result;
    },
    async set(items: Record<string, unknown>) {
      setCallCount++;
      if (options?.failSetOnCall === setCallCount) {
        throw new Error('StorageArea.set failed (simulated)');
      }
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

  it('serializes concurrent addMeasurement calls to prevent lost updates', async () => {
    // Start 5 concurrent calls that each add 1 second and 1 slide
    const promises = [
      client.addMeasurement({
        platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 1, deltaSlides: 1, itemHashes: ['a'],
      }),
      client.addMeasurement({
        platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 1, deltaSlides: 1, itemHashes: ['b'],
      }),
      client.addMeasurement({
        platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 1, deltaSlides: 1, itemHashes: ['c'],
      }),
      client.addMeasurement({
        platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 1, deltaSlides: 1, itemHashes: ['d'],
      }),
      client.addMeasurement({
        platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 1, deltaSlides: 1, itemHashes: ['e'],
      }),
    ];

    await Promise.all(promises);
    const schema = await client.read();

    // All 5 calls should accumulate correctly: 5 seconds, 5 slides, 5 items
    expect(schema.daily['2026-08-30'].youtube_shorts).toEqual({
      seconds: 5,
      slides: 5,
      items: 5,
    });
  });

  it('handles concurrent addMeasurement and updateSettings without conflicts', async () => {
    const promises = [
      client.addMeasurement({
        platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 10, deltaSlides: 2, itemHashes: ['x', 'y'],
      }),
      client.updateSettings({ dayBoundaryHour: 3 }),
      client.addMeasurement({
        platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 5, deltaSlides: 1, itemHashes: ['z'],
      }),
    ];

    await Promise.all(promises);
    const schema = await client.read();

    // Measurements should accumulate
    expect(schema.daily['2026-08-30'].youtube_shorts).toEqual({
      seconds: 15,
      slides: 3,
      items: 3,
    });

    // Settings should be updated
    expect(schema.settings.dayBoundaryHour).toBe(3);
  });

  it('propagates errors from addMeasurement to the caller', async () => {
    const failingClient = new StorageClient(createFakeArea({ failSetOnCall: 1 }));

    const addPromise = failingClient.addMeasurement({
      platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 5, deltaSlides: 1, itemHashes: ['a'],
    });

    // The promise should reject with the storage error
    await expect(addPromise).rejects.toThrow('StorageArea.set failed');
  });

  it('recovers from failed write and continues queue for subsequent calls', async () => {
    const failingArea = createFakeArea({ failSetOnCall: 1 });
    const failingClient = new StorageClient(failingArea);

    // First call fails
    const failPromise = failingClient.addMeasurement({
      platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 1, deltaSlides: 0, itemHashes: ['a'],
    });
    await expect(failPromise).rejects.toThrow();

    // Second call should succeed despite the first failure
    // (because the queue is not broken by the catch)
    const successPromise = failingClient.addMeasurement({
      platform: 'youtube_shorts', dateKey: '2026-08-30', deltaSeconds: 5, deltaSlides: 1, itemHashes: ['b'],
    });
    await expect(successPromise).resolves.toBeUndefined();

    // Verify that the successful measurement was stored
    const schema = await failingClient.read();
    expect(schema.daily['2026-08-30'].youtube_shorts).toEqual({
      seconds: 5,
      slides: 1,
      items: 1,
    });
  });

  it('propagates errors from updateSettings to the caller', async () => {
    const failingClient = new StorageClient(createFakeArea({ failSetOnCall: 1 }));

    const updatePromise = failingClient.updateSettings({ dayBoundaryHour: 3 });

    // The promise should reject with the storage error
    await expect(updatePromise).rejects.toThrow('StorageArea.set failed');
  });

  it('recovers from failed updateSettings and continues queue', async () => {
    const failingArea = createFakeArea({ failSetOnCall: 1 });
    const failingClient = new StorageClient(failingArea);

    // First call fails
    const failPromise = failingClient.updateSettings({ dayBoundaryHour: 3 });
    await expect(failPromise).rejects.toThrow();

    // Second call should succeed
    const successPromise = failingClient.updateSettings({ dayBoundaryHour: 4 });
    await expect(successPromise).resolves.toBeUndefined();

    // Verify that the setting was updated
    const schema = await failingClient.read();
    expect(schema.settings.dayBoundaryHour).toBe(4);
  });
});
