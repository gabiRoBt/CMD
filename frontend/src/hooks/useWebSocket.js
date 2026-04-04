import { useRef, useCallback } from 'react';

/**
 * Manages a persistent WebSocket connection that reconnects on drop.
 * Returns { connect, send, close }.
 *
 * @param {(event: object) => void} onEvent  Called for every parsed JSON message.
 * @param {(status: 'ONLINE'|'OFFLINE') => void} onStatus  Called on connection state changes.
 */
export function useWebSocket(onEvent, onStatus) {
  const wsRef         = useRef(null);
  const onEventRef    = useRef(onEvent);
  const onStatusRef   = useRef(onStatus);
  onEventRef.current  = onEvent;
  onStatusRef.current = onStatus;

  const connect = useCallback((playerID) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws    = new WebSocket(`${proto}://${location.host}/ws?player_id=${encodeURIComponent(playerID)}`);
    wsRef.current = ws;

    ws.onopen  = () => onStatusRef.current('ONLINE');
    ws.onclose = () => {
      onStatusRef.current('OFFLINE');
      setTimeout(() => connect(playerID), 3000);
    };
    ws.onmessage = (ev) => {
      try { onEventRef.current(JSON.parse(ev.data)); } catch (e) { console.error('[WS]', e); }
    };
  }, []);

  const close = useCallback(() => wsRef.current?.close(), []);

  return { connect, close };
}
