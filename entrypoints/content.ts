/// <reference path="../.wxt/wxt.d.ts" />

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  runAt: 'document_idle',
  main() {},
});
