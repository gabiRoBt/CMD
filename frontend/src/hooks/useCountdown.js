import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Countdown timer resistant to background-tab throttling.
 *
 * Uses Date.now() as the source of truth instead of relying on setInterval
 * firing exactly every 1000 ms (browsers throttle inactive tabs to ≥1s intervals).
 *
 * On visibilitychange (tab becomes active again) we immediately recompute the
 * remaining time so the display snaps back to the correct value.
 */
export function useCountdown() {
  const [seconds,  setSeconds]  = useState(0);
  const endTimeRef  = useRef(null); // absolute timestamp when countdown reaches 0
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    endTimeRef.current  = null;
  }, []);

  /** Recompute remaining seconds from wall clock and update state. */
  const tick = useCallback(() => {
    if (endTimeRef.current == null) return;
    const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
    setSeconds(remaining);
    if (remaining <= 0) stop();
  }, [stop]);

  const start = useCallback((secs) => {
    stop();
    endTimeRef.current = Date.now() + secs * 1000;
    setSeconds(secs);
    intervalRef.current = setInterval(tick, 500); // 500 ms for smoother recovery
  }, [stop, tick]);

  // Resync immediately when the tab becomes visible again
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tick]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return { seconds, start, stop };
}

/** Formats a raw seconds value as MM:SS. */
export const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

