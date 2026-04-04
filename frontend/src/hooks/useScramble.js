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
 * Fix for "cdcp" display artefact:
 *   xterm sends chars one-by-one → SSH echoes them → user sees typed text.
 *   On Enter we send Ctrl+U (\x15) which makes bash erase the current input line,
 *   then we send the substituted command + \r. Net effect: user sees their typed
 *   command vanish and the scrambled one execute silently.
 */
export function useScramble(wsRef) {
  const timerRef = useRef(null);

  /** Restore ws.send to its original and clear timer. */
  const cancelScramble = useCallback(() => {
    clearTimeout(timerRef.current);
    const ws = wsRef.current;
    if (ws?._origSend) {
      ws.send      = ws._origSend;
      ws._origSend = null;
    }
  }, [wsRef]);

  const activateScramble = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Reset any previous patch first
    cancelScramble();

    // Build bijective random remap (no fixed points guaranteed by Sattolo)
    const shuffled = derangement(CMDS);
    const cmdMap   = new Map(CMDS.map((cmd, i) => [cmd, shuffled[i]]));

    const orig     = ws.send.bind(ws);
    ws._origSend   = orig;
    let buf        = '';

    ws.send = (data) => {
      // Binary frames (terminal resize, etc.) pass through unchanged
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        return orig(data);
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
          // \x15 = Ctrl+U → bash clears the current visible input line,
          // then we type the substituted command and press Enter.
          // The echo of the erased chars disappears; only the substituted
          // command is echoed and executed.
          const rewritten = [mapped, ...args].join(' ');
          orig('\x15' + rewritten + '\r');
        } else {
          orig(data);
        }
        return;
      }

      // ── Backspace ────────────────────────────────────────────────────────
      if (str === '\x7f' || str === '\b') {
        buf = buf.slice(0, -1);
        orig(data);
        return;
      }

      // ── Escape sequences / control codes → pass through, don't buffer ───
      if (str.startsWith('\x1b') || str.charCodeAt(0) < 32) {
        orig(data);
        return;
      }

      // ── Printable character ───────────────────────────────────────────────
      buf += str;
      orig(data);
    };

    timerRef.current = setTimeout(cancelScramble, SCRAMBLE_MS);
  }, [wsRef, cancelScramble]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    cancelScramble();
  }, [cancelScramble]);

  return { activateScramble, cancelScramble };
}
