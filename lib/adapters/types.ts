import type { PlatformId } from '../types';

export interface PlatformAdapter {
  id: PlatformId;
  label: string;
  matches: string[];
  isActivePage(): boolean;
  getCurrentItemId(): string | null;
  isPlaying(): boolean;
  subscribeNavigation(cb: () => void): () => void;
}
