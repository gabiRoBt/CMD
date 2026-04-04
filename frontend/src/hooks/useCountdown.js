import { useState, useRef, useCallback } from 'react';

/**
 * Countdown timer. Returns { seconds, start, stop }.
 * `start(n)` resets and starts counting from n down to 0.
 */
export function useCountdown() {
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const start = useCallback((secs) => {
    stop();
    setSeconds(secs);
    timerRef.current = setInterval(() => {
      setSeconds((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }, [stop]);

  return { seconds, start, stop };
}

/** Formats a raw seconds value as MM:SS. */
export const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
