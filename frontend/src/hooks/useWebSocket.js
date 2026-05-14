import { useRef, useCallback } from 'react';

/**
 * Manages a persistent WebSocket connection that reconnects on drop.
 * Returns { connect, close }.
 *
 * @param {(event: object) => void} onEvent  Called for every parsed JSON message.
 * @param {(status: 'ONLINE'|'OFFLINE') => void} onStatus  Called on connection state changes.
 */
export function useWebSocket(onEvent, onStatus) {
  const wsRef              = useRef(null);
  const onEventRef         = useRef(onEvent);
  const onStatusRef        = useRef(onStatus);
  const intentionalCloseRef = useRef(false);
  const reconnectTimerRef  = useRef(null);

  onEventRef.current  = onEvent;
  onStatusRef.current = onStatus;

  const connect = useCallback((playerID) => {
    // Cancel any pending reconnect from a previous connection
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;

    // Prevent stacking connections — close existing one first.
    // We set intentionalClose=true so the old WS's async onclose handler
    // won't trigger a reconnect (critical for React StrictMode double-fire).
    intentionalCloseRef.current = true;
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const token = localStorage.getItem('cmd_token') || '';
    const ws    = new WebSocket(
      `${proto}://${location.host}/ws?player_id=${encodeURIComponent(playerID)}&token=${encodeURIComponent(token)}`
    );
    wsRef.current = ws;

    // Reset intentional-close for the NEW connection.
    // The old WS's onclose uses identity check (ws === wsRef.current)
    // to avoid interfering, but this flag provides a second safeguard.
    intentionalCloseRef.current = false;

    ws.onopen = () => onStatusRef.current('ONLINE');

    ws.onclose = () => {
      onStatusRef.current('OFFLINE');
      // Only reconnect if:
      //   1. This WS is still the current one (not replaced by a newer connect() call)
      //   2. The close was NOT intentional (e.g. logout)
      if (wsRef.current === ws && !intentionalCloseRef.current) {
        reconnectTimerRef.current = setTimeout(() => connect(playerID), 3000);
      }
    };

    ws.onmessage = (ev) => {
      try { onEventRef.current(JSON.parse(ev.data)); } catch (e) { console.error('[WS]', e); }
    };
  }, []);

  const close = useCallback(() => {
    intentionalCloseRef.current = true;
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }
  }, []);

  return { connect, close };
}
