import { useRef, useCallback, useEffect } from 'react';

/**
 * Sattolo cycle — generates a true derangement (no element stays in its position).
 * Guarantees every command maps to a DIFFERENT command.
 */
function derangement(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i); // j ∈ [0, i-1] — never i
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const CMDS       = ['ls', 'cd', 'cat', 'rm', 'mkdir', 'touch', 'mv', 'cp', 'find', 'grep'];
const SCRAMBLE_MS = 30_000;

/**
 * Intercepts the terminal WebSocket to scramble command names for 30 s.
 *
 * Uses the shared intercept chain via ws._cmdInterceptors to avoid
 * conflicts with useRocket (both previously monkey-patched ws.send).
 *
 * Fix for "cdcp" display artefact:
 *   xterm sends chars one-by-one → SSH echoes them → user sees typed text.
 *   On Enter we send Ctrl+U (\x15) which makes bash erase the current input line,
 *   then we send the substituted command + \r. Net effect: user sees their typed
 *   command vanish and the scrambled one execute silently.
 */
export function useScramble(wsRef) {
  const timerRef = useRef(null);
  const idRef    = useRef(null);

  /** Remove interceptor and clear timer. */
  const cancelScramble = useCallback(() => {
    clearTimeout(timerRef.current);
    const ws = wsRef.current;
    if (ws?._cmdInterceptors && idRef.current) {
      ws._cmdInterceptors.delete(idRef.current);
      idRef.current = null;
    }
  }, [wsRef]);

  const activateScramble = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Reset any previous interceptor first
    cancelScramble();

    // Build bijective random remap (no fixed points guaranteed by Sattolo)
    const shuffled = derangement(CMDS);
    const cmdMap   = new Map(CMDS.map((cmd, i) => [cmd, shuffled[i]]));

    let buf = '';

    const interceptor = (data, origSend) => {
      // Binary frames (terminal resize, etc.) pass through unchanged
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        return origSend(data);
      }

      const str = typeof data === 'string' ? data : String(data);

      // ── Enter key ────────────────────────────────────────────────────────
      if (str === '\r' || str === '\r\n') {
        const tokens = buf.trim().split(/\s+/);
        const cmd    = tokens[0];
        const args   = tokens.slice(1);
        buf = '';

        const mapped = cmdMap.get(cmd);
        if (mapped) {
          const rewritten = [mapped, ...args].join(' ');
          origSend('\x15' + rewritten + '\r');
        } else {
          origSend(data);
        }
        return;
      }

      // ── Backspace ────────────────────────────────────────────────────────
      if (str === '\x7f' || str === '\b') {
        buf = buf.slice(0, -1);
        origSend(data);
        return;
      }

      // ── Escape sequences / control codes → pass through, don't buffer ───
      if (str.startsWith('\x1b') || str.charCodeAt(0) < 32) {
        origSend(data);
        return;
      }

      // ── Printable character ───────────────────────────────────────────────
      buf += str;
      origSend(data);
    };

    // Register interceptor on the shared chain
    if (!ws._cmdInterceptors) ws._cmdInterceptors = new Map();
    const id = 'scramble';
    idRef.current = id;
    ws._cmdInterceptors.set(id, interceptor);
    _ensureInterceptChain(ws);

    timerRef.current = setTimeout(cancelScramble, SCRAMBLE_MS);
  }, [wsRef, cancelScramble]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    cancelScramble();
  }, [cancelScramble]);

  return { activateScramble, cancelScramble };
}

/**
 * Installs the shared ws.send intercept chain once.
 * All interceptors in ws._cmdInterceptors are called in order.
 * If none handle the data (all call origSend), the original send is used.
 */
function _ensureInterceptChain(ws) {
  if (ws._interceptChainInstalled) return;
  ws._interceptChainInstalled = true;

  const origSend = ws.send.bind(ws);
  ws._origSend = origSend;

  ws.send = (data) => {
    const interceptors = ws._cmdInterceptors;
    if (!interceptors || interceptors.size === 0) {
      return origSend(data);
    }

    // Check 'rocket' first — if active, it blocks all input
    const rocketFn = interceptors.get('rocket');
    if (rocketFn) {
      return rocketFn(data, origSend);
    }

    // Then try 'scramble'
    const scrambleFn = interceptors.get('scramble');
    if (scrambleFn) {
      return scrambleFn(data, origSend);
    }

    // Fallback: no active interceptor
    return origSend(data);
  };
}
