import type { PlatformAdapter } from './types';
import { YOUTUBE_SHORTS_SELECTORS } from './selectors';

function extractVideoIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/shorts\/([^/?#]+)/);
  return match ? match[1] : null;
}

export const youtubeShortsAdapter: PlatformAdapter = {
  id: 'youtube_shorts',
  label: 'YouTube Shorts',
  matches: ['*://www.youtube.com/*'],

  isActivePage() {
    return location.pathname.startsWith('/shorts/');
  },

  getCurrentItemId() {
    const activeReel = document.querySelector(YOUTUBE_SHORTS_SELECTORS.activeReel);
    const idFromAttr = activeReel?.getAttribute('video-id') ?? activeReel?.getAttribute('data-video-id');
    if (idFromAttr) return idFromAttr;
    return extractVideoIdFromPath(location.pathname);
  },

  isPlaying() {
    const video =
      document.querySelector<HTMLVideoElement>(YOUTUBE_SHORTS_SELECTORS.videoInActiveReel) ??
      document.querySelector<HTMLVideoElement>('video');
    if (!video) return false;
    return !video.paused && video.readyState >= 2;
  },

  subscribeNavigation(cb) {
    const handler = () => cb();
    document.addEventListener('yt-navigate-finish', handler);
    window.addEventListener('popstate', handler);

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    history.pushState = ((...args: Parameters<History['pushState']>) => {
      originalPushState(...args);
      cb();
    }) as History['pushState'];
    history.replaceState = ((...args: Parameters<History['replaceState']>) => {
      originalReplaceState(...args);
      cb();
    }) as History['replaceState'];

    const observer = new MutationObserver(() => cb());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('yt-navigate-finish', handler);
      window.removeEventListener('popstate', handler);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      observer.disconnect();
    };
  },
};
