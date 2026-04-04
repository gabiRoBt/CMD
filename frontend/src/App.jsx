import { useState, useCallback } from 'react';

import { i18n }           from './i18n';
import { useCountdown }   from './hooks/useCountdown';
import { useWebSocket }   from './hooks/useWebSocket';
import { useGameState }   from './hooks/useGameState';

import { AppHeader } from './components/shared/AppHeader';
import Lobby         from './components/Lobby';
import Arena         from './components/Arena';

export default function App() {
  // ── Persistent UI preferences ────────────────────────────────────────────
  const [lang, setLang] = useState('en');
  const [skin, setSkin] = useState('skin-classic');

  // ── Connection & identity ────────────────────────────────────────────────
  const [wsStatus,  setWsStatus]  = useState('OFFLINE');
  const [playerID,  setPlayerID]  = useState(null);

  // ── Lobby state ──────────────────────────────────────────────────────────
  const [arenaList, setArenaList] = useState([]);
  const [arenaID,   setArenaID]   = useState(null);
  const [role,      setRole]      = useState(null);

  // ── View ─────────────────────────────────────────────────────────────────
  const [view, setView] = useState('lobby');

  const { seconds: countdown, start: startCountdown, stop: stopCountdown } = useCountdown();

  // Called when game_start arrives — transitions to arena view
  const onGameStart = useCallback((payload) => {
    setArenaID(payload.arena_id);
    setRole(payload.role);
    setView('arena');
  }, []);

  // ── Game state driven by WS events ──────────────────────────────────────
  const { phase, abilities, incomingAbility, playerIDRef, handleWSEvent } = useGameState({
    startCountdown,
    onGameStart,
  });

  // Extend WS handler to also update lobby arena list
  const onWSEvent = useCallback((ev) => {
    if (ev.type === 'arena_list') setArenaList(ev.payload ?? []);
    handleWSEvent(ev);
  }, [handleWSEvent]);

  const { connect: connectWS } = useWebSocket(onWSEvent, setWsStatus);

  // ── Actions ──────────────────────────────────────────────────────────────
  const identify = useCallback((id) => {
    playerIDRef.current = id;
    setPlayerID(id);
    connectWS(id);
  }, [connectWS, playerIDRef]);

  const returnToLobby = useCallback(() => {
    stopCountdown();
    setView('lobby');
    setArenaID(null);
    setRole(null);
  }, [stopCountdown]);

  const t = i18n[lang];

  return (
    <>
      <AppHeader
        view={view}
        lang={lang}
        skin={skin}
        wsStatus={wsStatus}
        playerID={playerID}
        countdown={countdown}
        phase={phase}
        onLangChange={setLang}
        onSkinChange={setSkin}
      />

      {view === 'lobby' ? (
        <Lobby
          t={t}
          playerID={playerID}
          arenaID={arenaID}
          arenaList={arenaList}
          onIdentify={identify}
          onUpdateArena={(id, r) => { setArenaID(id); setRole(r); }}
          onLeaveArena={() => { setArenaID(null); setRole(null); }}
        />
      ) : (
        <Arena
          t={t}
          lang={lang}
          arenaID={arenaID}
          playerID={playerID}
          role={role}
          phase={phase}
          abilities={abilities}
          skin={skin}
          incomingAbility={incomingAbility}
          onReturnToLobby={returnToLobby}
        />
      )}
    </>
  );
}
