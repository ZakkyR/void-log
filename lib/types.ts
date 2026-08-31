export type PlatformId = 'youtube_shorts' | 'tiktok' | 'x_for_you';

export interface PlatformMetrics {
  seconds: number;
  slides: number;
  items: number;
}

export type DailyRecord = Partial<Record<PlatformId, PlatformMetrics>>;

export interface Settings {
  dayBoundaryHour: number;
  weekStart: 'monday' | 'sunday';
  displayName: string;
  discordWebhookUrl: string;
  discordFormat: 'embed' | 'content';
  enabledPlatforms: PlatformId[];
  templates: { x: string; discord: string };
}

export interface RuntimeState {
  todayDate: string;
  todayItemIds: Partial<Record<PlatformId, string[]>>;
}

export interface StorageSchema {
  schemaVersion: number;
  settings: Settings;
  daily: Record<string, DailyRecord>;
  runtime: RuntimeState;
}

export interface AggregatedMetrics {
  seconds: number;
  slides: number;
  items: number;
  byPlatform: Partial<Record<PlatformId, PlatformMetrics>>;
}

export interface FlushMessage {
  type: 'voidlog:flush';
  platform: PlatformId;
  dateKey: string;
  seconds: number;
  slides: number;
  itemHashes: string[];
}

export interface SendDiscordMessage {
  type: 'voidlog:sendDiscord';
  webhookUrl: string;
  payload: unknown;
}

export type VoidLogMessage = FlushMessage | SendDiscordMessage;
