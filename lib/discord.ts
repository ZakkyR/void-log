import type { TemplateContext } from './template';
import { renderTemplate } from './template';

export interface DiscordEmbedPayload {
  embeds: Array<{
    title: string;
    description: string;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
}

export interface DiscordContentPayload {
  content: string;
}

export interface DiscordTemplates {
  content: string;
  embedTitle: string;
  embedDescription: string;
}

export function buildDiscordPayload(
  format: 'embed' | 'content',
  context: TemplateContext,
  templates: DiscordTemplates,
): DiscordEmbedPayload | DiscordContentPayload {
  if (format === 'content') {
    return { content: renderTemplate(templates.content, context) };
  }
  return {
    embeds: [{
      title: renderTemplate(templates.embedTitle, context),
      description: renderTemplate(templates.embedDescription, context),
      fields: [
        { name: '視聴時間', value: context.duration, inline: true },
        { name: 'スライド回数', value: `${context.slides}回`, inline: true },
        { name: '視聴本数', value: `${context.items}本`, inline: true },
        { name: '累計視聴時間', value: context.total_duration, inline: true },
      ],
    }],
  };
}
