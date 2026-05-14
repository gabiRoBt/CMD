import { useRef, useCallback, useEffect } from 'react';

const ROCKET_MS = 15_000;

/**
 * Blocks all keyboard input to the terminal WebSocket for 15 seconds.
 *
 * Uses the shared intercept chain via ws._cmdInterceptors to avoid
 * conflicts with useScramble (both previously monkey-patched ws.send).
 *
 * Binary frames (resize) pass through so the terminal UI stays functional.
 * On deactivation the interceptor is removed from the chain.
 */
export function useRocket(wsRef) {
  const timerRef = useRef(null);
  const idRef    = useRef(null);

  const cancelRocket = useCallback(() => {
    clearTimeout(timerRef.current);
    const ws = wsRef.current;
    if (ws?._cmdInterceptors && idRef.current) {
      ws._cmdInterceptors.delete(idRef.current);
      idRef.current = null;
    }
  }, [wsRef]);

  const activateRocket = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Reset any previous interceptor first
    cancelRocket();

    const interceptor = (data, origSend) => {
      // Always allow binary frames (resize events, etc.)
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        return origSend(data);
      }
      // Silently drop all typed input while rocket is active
    };

    // Register interceptor on the shared chain
    if (!ws._cmdInterceptors) ws._cmdInterceptors = new Map();
    const id = 'rocket';
    idRef.current = id;
    ws._cmdInterceptors.set(id, interceptor);

    // Ensure the intercept chain is installed (useScramble may have done it already)
    if (!ws._interceptChainInstalled) {
      ws._interceptChainInstalled = true;
      const origSend = ws.send.bind(ws);
      ws._origSend = origSend;

      ws.send = (d) => {
        const interceptors = ws._cmdInterceptors;
        if (!interceptors || interceptors.size === 0) return origSend(d);
        const rocketFn = interceptors.get('rocket');
        if (rocketFn) return rocketFn(d, origSend);
        const scrambleFn = interceptors.get('scramble');
        if (scrambleFn) return scrambleFn(d, origSend);
        return origSend(d);
      };
    }

    timerRef.current = setTimeout(cancelRocket, ROCKET_MS);
  }, [wsRef, cancelRocket]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    cancelRocket();
  }, [cancelRocket]);

  return { activateRocket, cancelRocket };
}
