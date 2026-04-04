import { useState, useRef, useCallback } from 'react';

const DURATION_MS = 3000;

/**
 * Simple auto-dismissing notification.
 * Returns { notif: { show, msg }, showNotif }.
 */
export function useNotification() {
  const [notif, setNotif]   = useState({ show: false, msg: '' });
  const timerRef            = useRef(null);

  const showNotif = useCallback((msg) => {
    clearTimeout(timerRef.current);
    setNotif({ show: true, msg });
    timerRef.current = setTimeout(() => setNotif({ show: false, msg: '' }), DURATION_MS);
  }, []);

  return { notif, showNotif };
}
