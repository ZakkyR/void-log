import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MeasurementEngine } from '@/lib/engine/measurementEngine';
import type { PlatformAdapter } from '@/lib/adapters/types';

function createFakeAdapter(overrides: Partial<PlatformAdapter> = {}): PlatformAdapter {
  return {
    id: 'youtube_shorts',
    label: 'test',
    matches: [],
    isActivePage: () => true,
    getCurrentItemId: () => 'item-1',
    isPlaying: () => true,
    subscribeNavigation: () => () => {},
    ...overrides,
  };
}

describe('MeasurementEngine', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('accumulates seconds while playing, visible, and focused', () => {
    const onSecondsTick = vi.fn();
    const onItemChange = vi.fn();
    let now = 0;
    const engine = new MeasurementEngine(
      { adapter: createFakeAdapter(), now: () => now, isDocumentVisible: () => true, isWindowFocused: () => true },
      { onSecondsTick, onSlide: vi.fn(), onItemChange },
    );
    engine.start();
    now += 1000;
    vi.advanceTimersByTime(1000);
    expect(onSecondsTick).toHaveBeenCalledWith(1);
    expect(onItemChange).toHaveBeenCalledWith('item-1');
  });

  it('does not accumulate seconds when not visible', () => {
    const onSecondsTick = vi.fn();
    let now = 0;
    const engine = new MeasurementEngine(
      { adapter: createFakeAdapter(), now: () => now, isDocumentVisible: () => false, isWindowFocused: () => true },
      { onSecondsTick, onSlide: vi.fn(), onItemChange: vi.fn() },
    );
    engine.start();
    now += 1000;
    vi.advanceTimersByTime(1000);
    expect(onSecondsTick).not.toHaveBeenCalled();
  });

  it('counts a slide when the item id changes after the first item', () => {
    const onSlide = vi.fn();
    let currentId = 'item-1';
    let now = 0;
    const engine = new MeasurementEngine(
      { adapter: createFakeAdapter({ getCurrentItemId: () => currentId }), now: () => now, isDocumentVisible: () => true, isWindowFocused: () => true },
      { onSecondsTick: vi.fn(), onSlide, onItemChange: vi.fn() },
    );
    engine.start();
    expect(onSlide).not.toHaveBeenCalled();
    currentId = 'item-2';
    now += 1000;
    vi.advanceTimersByTime(1000);
    expect(onSlide).toHaveBeenCalledTimes(1);
  });

  it('stops accumulating after stop() is called', () => {
    const onSecondsTick = vi.fn();
    let now = 0;
    const engine = new MeasurementEngine(
      { adapter: createFakeAdapter(), now: () => now, isDocumentVisible: () => true, isWindowFocused: () => true },
      { onSecondsTick, onSlide: vi.fn(), onItemChange: vi.fn() },
    );
    engine.start();
    engine.stop();
    now += 5000;
    vi.advanceTimersByTime(5000);
    expect(onSecondsTick).not.toHaveBeenCalled();
  });
});
