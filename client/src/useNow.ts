import { useCallback, useSyncExternalStore } from 'react';

/** The current time, rounded down to `intervalMs`, re-rendering every interval while `active`. */
export function useNow(intervalMs: number, active = true): number {
  const subscribe = useCallback(
    (onTick: () => void) => {
      if (!active) return () => {};
      const id = setInterval(onTick, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs, active],
  );
  return useSyncExternalStore(subscribe, () => Math.floor(Date.now() / intervalMs) * intervalMs);
}
