export interface FlushGuardState {
  tabId: number;
  timestampMs: number;
}

export function shouldAcceptFlush(
  prev: FlushGuardState | null,
  next: { tabId: number; timestampMs: number },
): boolean {
  if (!prev) return true;
  const sameSecond = Math.floor(prev.timestampMs / 1000) === Math.floor(next.timestampMs / 1000);
  return !(sameSecond && prev.tabId !== next.tabId);
}
