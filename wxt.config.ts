import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: {
    name: '虚無ログ',
    description: 'YouTube Shorts の視聴時間・スライド回数を計測し、可視化と手動投稿を行うブラウザ拡張',
    version: '0.1.0',
    permissions: ['storage', 'downloads'],
    host_permissions: [
      '*://www.youtube.com/*',
      'https://discord.com/api/webhooks/*',
    ],
    browser_specific_settings: {
      gecko: {
        id: 'void-log@zakkyr.dev',
        strict_min_version: '140.0',
        // @ts-expect-error: data_collection_permissions is a newer AMO manifest key not yet in wxt's bundled types
        data_collection_permissions: {
          required: ['none'],
        },
      },
      gecko_android: {
        strict_min_version: '142.0',
      },
    },
  },
});
