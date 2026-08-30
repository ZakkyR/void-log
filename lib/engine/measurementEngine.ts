import type { PlatformAdapter } from '../adapters/types';

export interface EngineDeps {
  adapter: PlatformAdapter;
  now(): number;
  isDocumentVisible(): boolean;
  isWindowFocused(): boolean;
}

export interface EngineCallbacks {
  onSecondsTick(deltaSeconds: number): void;
  onSlide(): void;
  onItemChange(itemId: string): void;
}

export class MeasurementEngine {
  private lastItemId: string | null = null;
  private hasSeenFirstItem = false;
  private lastNow: number | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor(private deps: EngineDeps, private callbacks: EngineCallbacks) {}

  start(): void {
    this.tick();
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.lastNow = null;
  }

  private tick(): void {
    const currentId = this.deps.adapter.getCurrentItemId();
    if (currentId !== null && currentId !== this.lastItemId) {
      if (this.hasSeenFirstItem) this.callbacks.onSlide();
      this.hasSeenFirstItem = true;
      this.lastItemId = currentId;
      this.callbacks.onItemChange(currentId);
    }

    const canCount = this.deps.isDocumentVisible() && this.deps.isWindowFocused() && this.deps.adapter.isPlaying();
    const now = this.deps.now();
    if (canCount && this.lastNow !== null) {
      const deltaSeconds = (now - this.lastNow) / 1000;
      if (deltaSeconds > 0) this.callbacks.onSecondsTick(deltaSeconds);
    }
    this.lastNow = canCount ? now : null;
  }
}
