import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

const TERM_OPTIONS = {
  cursorBlink: true,
  fontFamily:  '"Share Tech Mono", monospace',
  fontSize:    13,
  theme:       { background: 'transparent', foreground: '#00ff41', cursor: '#00ff41' },
};

/**
 * Mounts an xterm terminal inside `containerRef` and connects it to the
 * terminal WebSocket proxy. Re-initialises whenever arenaID, playerID or
 * phase changes (phase change = new SSH target).
 *
 * Returns `fitAddonRef` so the caller can trigger a resize if needed.
 */
export function useTerminal(containerRef, { arenaID, playerID, phase }) {
  const fitAddonRef = useRef(null);
  const wsRef       = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = '';

    const term     = new Terminal(TERM_OPTIONS);
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;

    term.loadAddon(fitAddon);
    term.open(el);
    fitAddon.fit();

    // Clipboard shortcuts
    term.attachCustomKeyEventHandler((e) => {
      if (e.ctrlKey && e.code === 'KeyC' && e.type === 'keydown') {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection());
          term.clearSelection();
          return false;
        }
        return true;
      }
      if (e.ctrlKey && e.code === 'KeyV' && e.type === 'keydown') return false;
      return true;
    });

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws    = new WebSocket(
      `${proto}://${location.host}/ws/terminal?arena_id=${arenaID}&player_id=${playerID}`,
    );
    wsRef.current  = ws;
    ws.binaryType  = 'arraybuffer';
    ws.onmessage   = (e) => term.write(e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : e.data);
    ws.onopen      = () => term.focus();
    ws.onclose     = () => term.write('\r\n\x1b[31m[connection closed]\x1b[0m\r\n');
    term.onData((d) => { if (ws.readyState === WebSocket.OPEN) ws.send(d); });

    const onResize = () => { try { fitAddon.fit(); } catch (_) {} };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      term.dispose();
      if (ws.readyState <= WebSocket.OPEN) ws.close();
    };
  }, [arenaID, playerID, phase, containerRef]);

  // Keep terminal sized to its container via ResizeObserver
  useEffect(() => {
    const win = containerRef.current?.closest('#terminal-win');
    if (!win) return;
    const ro = new ResizeObserver(() => { try { fitAddonRef.current?.fit(); } catch (_) {} });
    ro.observe(win);
    return () => ro.disconnect();
  }, [containerRef]);

  return { fitAddonRef, wsRef };
}
