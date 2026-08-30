import type { DailyRecord, PlatformId, RuntimeState, Settings, StorageSchema } from './types';

export interface StorageArea {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  dayBoundaryHour: 0,
  weekStart: 'monday',
  discordWebhookUrl: '',
  discordFormat: 'embed',
  enabledPlatforms: ['youtube_shorts'],
  templates: {
    x: '【懺悔】本日のショート視聴\n視聴時間: {duration}\nスライド回数: {slides}回\n累計: {total_duration}\n#ショート懺悔',
    discord: '【懺悔ログ】{period}\n視聴時間: {duration}\nスライド回数: {slides}回\n視聴本数: {items}本\n累計視聴時間: {total_duration}',
  },
};

function defaultRuntime(): RuntimeState {
  return { todayDate: '', todayItemIds: {} };
}

export class StorageClient {
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private area: StorageArea) {}

  async read(): Promise<StorageSchema> {
    const raw = await this.area.get(['schemaVersion', 'settings', 'daily', 'runtime']);
    return {
      schemaVersion: (raw.schemaVersion as number) ?? CURRENT_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings as Partial<Settings> | undefined) },
      daily: (raw.daily as Record<string, DailyRecord>) ?? {},
      runtime: (raw.runtime as RuntimeState) ?? defaultRuntime(),
    };
  }

  async addMeasurement(input: {
    platform: PlatformId;
    dateKey: string;
    deltaSeconds: number;
    deltaSlides: number;
    itemHashes: string[];
  }): Promise<void> {
    const result = this.writeQueue.then(async () => {
      const schema = await this.read();
      if (schema.runtime.todayDate !== input.dateKey) {
        schema.runtime.todayDate = input.dateKey;
        schema.runtime.todayItemIds = {};
      }
      const seen = new Set(schema.runtime.todayItemIds[input.platform] ?? []);
      let newItems = 0;
      for (const hash of input.itemHashes) {
        if (!seen.has(hash)) {
          seen.add(hash);
          newItems += 1;
        }
      }
      schema.runtime.todayItemIds[input.platform] = Array.from(seen);

      const day = schema.daily[input.dateKey] ?? {};
      const current = day[input.platform] ?? { seconds: 0, slides: 0, items: 0 };
      day[input.platform] = {
        seconds: current.seconds + input.deltaSeconds,
        slides: current.slides + input.deltaSlides,
        items: current.items + newItems,
      };
      schema.daily[input.dateKey] = day;

      await this.area.set({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        daily: schema.daily,
        runtime: schema.runtime,
      });
    });
    this.writeQueue = result.catch(() => {
      // Ensure queue continues even if operation fails
    });
    return result;
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    const result = this.writeQueue.then(async () => {
      const schema = await this.read();
      const settings = { ...schema.settings, ...patch };
      await this.area.set({ schemaVersion: CURRENT_SCHEMA_VERSION, settings });
    });
    this.writeQueue = result.catch(() => {
      // Ensure queue continues even if operation fails
    });
    return result;
  }

  async replaceAll(schema: StorageSchema): Promise<void> {
    const result = this.writeQueue.then(async () => {
      await this.area.set({
        schemaVersion: schema.schemaVersion,
        settings: schema.settings,
        daily: schema.daily,
        runtime: schema.runtime,
      });
    });
    this.writeQueue = result.catch(() => {
      // Ensure queue continues even if operation fails
    });
    return result;
  }

  async clearAll(): Promise<void> {
    const result = this.writeQueue.then(async () => {
      await this.area.remove(['schemaVersion', 'settings', 'daily', 'runtime']);
    });
    this.writeQueue = result.catch(() => {
      // Ensure queue continues even if operation fails
    });
    return result;
  }
}
