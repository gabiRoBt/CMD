import { useRef, useCallback, useEffect } from 'react';

const ROCKET_MS = 15_000;

/**
 * Blocks all keyboard input to the terminal WebSocket for 15 seconds.
 *
 * Implementation: patches ws.send to silently drop any typed character data.
 * Binary frames (resize) pass through so the terminal UI stays functional.
 * On deactivation ws.send is fully restored.
 */
export function useRocket(wsRef) {
  const timerRef = useRef(null);

  const cancelRocket = useCallback(() => {
    clearTimeout(timerRef.current);
    const ws = wsRef.current;
    if (ws?._rocketOrig) {
      ws.send        = ws._rocketOrig;
      ws._rocketOrig = null;
    }
  }, [wsRef]);

  const activateRocket = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Reset any previous patch first
    cancelRocket();

    const orig     = ws.send.bind(ws);
    ws._rocketOrig = orig;

    ws.send = (data) => {
      // Always allow binary frames (resize events, etc.)
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        return orig(data);
      }
      // Silently drop all typed input while rocket is active
    };

    timerRef.current = setTimeout(cancelRocket, ROCKET_MS);
  }, [wsRef, cancelRocket]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    cancelRocket();
  }, [cancelRocket]);

  return { activateRocket, cancelRocket };
}
