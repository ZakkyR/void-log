import type { TemplateContext } from './template';
import { renderTemplate } from './template';

export interface DiscordEmbedPayload {
  embeds: Array<{
    title: string;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
}

export interface DiscordContentPayload {
  content: string;
}

export function buildDiscordPayload(
  format: 'embed' | 'content',
  periodLabel: string,
  context: TemplateContext,
  template: string,
): DiscordEmbedPayload | DiscordContentPayload {
  if (format === 'content') {
    return { content: renderTemplate(template, context) };
  }
  return {
    embeds: [{
      title: `懺悔ログ（${periodLabel}）`,
      fields: [
        { name: '視聴時間', value: context.duration, inline: true },
        { name: 'スライド回数', value: `${context.slides}回`, inline: true },
        { name: '視聴本数', value: `${context.items}本`, inline: true },
        { name: '累計視聴時間', value: context.total_duration, inline: true },
      ],
    }],
  };
}
