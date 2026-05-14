import { useEffect, useLayoutEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';

const TERM_OPTIONS = {
  cursorBlink: true,
  fontFamily:  '"Share Tech Mono", monospace',
  fontSize:    13,
  theme:       { background: 'transparent', foreground: '#00ff41', cursor: '#00ff41' },
};

/**
 * Mounts an xterm terminal inside `containerRef` and connects it to the
 * terminal WebSocket proxy. Re-initialises whenever arenaID, playerID or
 * phase changes (phase change = new container target).
 *
 * Returns `fitAddonRef` so the caller can trigger a resize if needed.
 */
export function useTerminal(containerRef, { arenaID, playerID, phase }) {
  const fitAddonRef   = useRef(null);
  const webglAddonRef = useRef(null);
  const wsRef         = useRef(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = '';

    const term     = new Terminal(TERM_OPTIONS);
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;

    term.loadAddon(fitAddon);
    term.open(el);

    // Activăm WebGL pentru randare pe GPU (scade semnificativ latența de tastare și afișare).
    // Folosim try-catch deoarece WebGL poate să nu fie suportat de anumite browsere/dispozitive.
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      term.loadAddon(webglAddon);
      webglAddonRef.current = webglAddon;
    } catch (err) {
      console.warn('WebGL addon could not be loaded, falling back to Canvas renderer.', err);
    }

    try {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        fitAddon.fit();
      }
    } catch (e) {
      console.warn('fitAddon.fit() failed on mount', e);
    }

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
    const token = localStorage.getItem('cmd_token') || '';
    const url   = `${proto}://${location.host}/ws/terminal?arena_id=${arenaID}&player_id=${playerID}&token=${encodeURIComponent(token)}`;

    term.write('\x1b[90m[connecting to container...]\x1b[0m\r\n');

    const ws       = new WebSocket(url);
    wsRef.current  = ws;
    ws.binaryType  = 'arraybuffer';
    ws.onmessage   = (e) => {
      term.write(e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : e.data);
    };
    ws.onopen      = () => { term.write('\x1b[32m[connected]\x1b[0m\r\n'); term.focus(); };
    ws.onclose     = () => term.write('\r\n\x1b[31m[connection closed]\x1b[0m\r\n');
    ws.onerror     = () => term.write('\r\n\x1b[33m[WS error — Docker may not be running]\x1b[0m\r\n');
    term.onData((d) => { if (ws.readyState === WebSocket.OPEN) ws.send(d); });

    const onResize = () => { 
      try { 
        if (el.clientWidth > 0 && el.clientHeight > 0) fitAddon.fit(); 
      } catch (_) {} 
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      try { webglAddonRef.current?.dispose(); } catch (e) {}
      try { term.dispose(); } catch (e) {}
      if (ws.readyState <= WebSocket.OPEN) ws.close();
    };
    // containerRef is a stable ref object — not included in deps (React best practice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaID, playerID, phase]);

  // Keep terminal sized to its container via ResizeObserver
  useEffect(() => {
    const win = containerRef.current?.closest('#terminal-win');
    if (!win) return;
    const ro = new ResizeObserver(() => { 
      try { 
        if (containerRef.current?.clientWidth > 0) fitAddonRef.current?.fit(); 
      } catch (_) {} 
    });
    ro.observe(win);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { fitAddonRef, wsRef };
}
