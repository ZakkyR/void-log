import { defineConfig } from 'wxt';

export default defineConfig({
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
        strict_min_version: '115.0',
      },
    },
  },
});
