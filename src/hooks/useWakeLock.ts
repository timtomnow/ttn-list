import { useEffect, useRef, useState } from 'react';

// Minimal type — TS lib.dom doesn't ship WakeLockSentinel widely yet.
type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (ev: 'release', fn: () => void) => void;
  removeEventListener: (ev: 'release', fn: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
};

export type WakeLockState =
  | { status: 'unsupported' }
  | { status: 'idle' }
  | { status: 'active' }
  | { status: 'error'; message: string };

/**
 * Acquire a screen wake lock for the lifetime of the calling component.
 * Re-acquires on visibilitychange. Best-effort: if the API is missing or
 * a request fails (older browsers, lack of user gesture), the screen
 * sleeps as normal — no fallback. Per project decisions (see plan.md).
 */
export function useWakeLock(enabled = true): WakeLockState {
  const [state, setState] = useState<WakeLockState>({ status: 'idle' });
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) {
      setState({ status: 'unsupported' });
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await wakeLock.request('screen');
        if (cancelled) {
          await sentinel.release().catch(() => undefined);
          return;
        }
        sentinelRef.current = sentinel;
        setState({ status: 'active' });
        sentinel.addEventListener('release', () => {
          // Browser may release on minimize / blur. Don't surface as error;
          // visibilitychange handler will re-request on resume.
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
            if (!cancelled) setState({ status: 'idle' });
          }
        });
      } catch (e) {
        if (!cancelled) {
          setState({ status: 'error', message: (e as Error).message || 'Wake lock denied' });
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) void s.release().catch(() => undefined);
    };
  }, [enabled]);

  return state;
}
