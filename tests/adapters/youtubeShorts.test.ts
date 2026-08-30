/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { youtubeShortsAdapter } from '@/lib/adapters/youtubeShorts';

beforeEach(() => {
  document.body.innerHTML = '';
  window.history.pushState({}, '', '/');
});

describe('youtubeShortsAdapter.isActivePage', () => {
  it('returns true when pathname starts with /shorts/', () => {
    window.history.pushState({}, '', '/shorts/abc123');
    expect(youtubeShortsAdapter.isActivePage()).toBe(true);
  });

  it('returns false otherwise', () => {
    window.history.pushState({}, '', '/watch?v=abc123');
    expect(youtubeShortsAdapter.isActivePage()).toBe(false);
  });
});

describe('youtubeShortsAdapter.getCurrentItemId', () => {
  it('reads the video-id attribute from the active reel', () => {
    document.body.innerHTML = '<ytd-reel-video-renderer is-active video-id="vid1"></ytd-reel-video-renderer>';
    expect(youtubeShortsAdapter.getCurrentItemId()).toBe('vid1');
  });

  it('falls back to the URL pathname when the attribute is missing', () => {
    window.history.pushState({}, '', '/shorts/vid2');
    expect(youtubeShortsAdapter.getCurrentItemId()).toBe('vid2');
  });
});

describe('youtubeShortsAdapter.isPlaying', () => {
  it('returns true when the video is not paused and has enough data', () => {
    document.body.innerHTML = '<ytd-reel-video-renderer is-active><video></video></ytd-reel-video-renderer>';
    const video = document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    Object.defineProperty(video, 'readyState', { value: 4, configurable: true });
    expect(youtubeShortsAdapter.isPlaying()).toBe(true);
  });

  it('returns false when there is no video element', () => {
    expect(youtubeShortsAdapter.isPlaying()).toBe(false);
  });
});

describe('youtubeShortsAdapter.subscribeNavigation', () => {
  it('invokes the callback on yt-navigate-finish and stops after unsubscribe', () => {
    let calls = 0;
    const unsubscribe = youtubeShortsAdapter.subscribeNavigation(() => { calls += 1; });
    document.dispatchEvent(new Event('yt-navigate-finish'));
    expect(calls).toBe(1);
    unsubscribe();
    document.dispatchEvent(new Event('yt-navigate-finish'));
    expect(calls).toBe(1);
  });
});
