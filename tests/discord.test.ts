import { describe, it, expect } from 'vitest';
import { buildDiscordPayload } from '@/lib/discord';
import type { TemplateContext } from '@/lib/template';

const context: TemplateContext = {
  period: '本日 (8/30)', date: '8/30', duration: '1時間23分45秒', minutes: 83, slides: 412,
  items: 268, avgPerItem: 18, total_duration: '10時間0分0秒', breakdown: 'YouTube Shorts',
  name_line: '私は以下の虚無な時間を過ごしてしまいました。',
};

describe('buildDiscordPayload', () => {
  it('builds an embed payload rendering the title/description templates, with fixed fields', () => {
    const payload = buildDiscordPayload('embed', context, {
      content: '',
      embedTitle: '【懺悔】{period} のショート視聴',
      embedDescription: '{name_line}',
    });
    expect(payload).toEqual({
      embeds: [{
        title: '【懺悔】本日 (8/30) のショート視聴',
        description: '私は以下の虚無な時間を過ごしてしまいました。',
        fields: [
          { name: '視聴時間', value: '1時間23分45秒', inline: true },
          { name: 'スライド回数', value: '412回', inline: true },
          { name: '視聴本数', value: '268本', inline: true },
          { name: '累計視聴時間', value: '10時間0分0秒', inline: true },
        ],
      }],
    });
  });

  it('renders custom embed title/description templates', () => {
    const payload = buildDiscordPayload('embed', context, {
      content: '',
      embedTitle: 'カスタムタイトル {slides}',
      embedDescription: 'カスタム説明 {duration}',
    });
    expect(payload).toEqual({
      embeds: [{
        title: 'カスタムタイトル 412',
        description: 'カスタム説明 1時間23分45秒',
        fields: [
          { name: '視聴時間', value: '1時間23分45秒', inline: true },
          { name: 'スライド回数', value: '412回', inline: true },
          { name: '視聴本数', value: '268本', inline: true },
          { name: '累計視聴時間', value: '10時間0分0秒', inline: true },
        ],
      }],
    });
  });

  it('builds a content payload by rendering the content template', () => {
    const payload = buildDiscordPayload('content', context, {
      content: '視聴時間: {duration}',
      embedTitle: '',
      embedDescription: '',
    });
    expect(payload).toEqual({ content: '視聴時間: 1時間23分45秒' });
  });
});
