import { useState, useCallback, useEffect } from 'react';

import { i18n }           from './i18n';
import { useCountdown }   from './hooks/useCountdown';
import { useWebSocket }   from './hooks/useWebSocket';
import { useGameState }   from './hooks/useGameState';

import { AppHeader } from './components/shared/AppHeader';
import { Auth }      from './components/Auth';
import Lobby         from './components/Lobby';
import Arena         from './components/Arena';
import { api }       from './api';

export default function App() {
  // ── Persistent UI preferences ────────────────────────────────────────────
  const [lang, setLang] = useState('en');
  const [skin, setSkin] = useState('skin-classic');

  // ── Connection & identity ────────────────────────────────────────────────
  const [wsStatus,  setWsStatus]  = useState('OFFLINE');
  const [user,      setUser]      = useState(null); // {username, elo, isGuest}
  const playerID = user?.username;

  // ── Arena state ──────────────────────────────────────────────────────────
  const [arenaList, setArenaList] = useState([]);
  const [arenaID,   setArenaID]   = useState(null);
  const [role,      setRole]      = useState(null);
  const [initialGameState, setInitialGameState] = useState(null);

  // ── View ─────────────────────────────────────────────────────────────────
  const [view, setView] = useState('auth'); // 'auth' | 'lobby' | 'arena'

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
    stopCountdown,
    onGameStart,
    initialState: initialGameState
  });

  // Extend WS handler to also update lobby arena list and player profile after game
  const onWSEvent = useCallback((ev) => {
    if (ev.type === 'arena_list') setArenaList(ev.payload ?? []);
    if (ev.type === 'game_over') {
      api.me().then(u => setUser(u)).catch(console.error);
    }
    handleWSEvent(ev);
  }, [handleWSEvent]);

  const { connect: connectWS } = useWebSocket(onWSEvent, setWsStatus);

  // ── Auth initialization ──────────────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        const u = await api.me();
        if (u && u.username) {
           setUser({ username: u.username, isGuest: u.is_guest, elo: u.elo || 0 });
           playerIDRef.current = u.username;

          // Checking if we are in a match
          try {
            const status = await api.myArenaStatus();
            if (status && status.in_arena) {
               connectWS(u.username);
               setArenaID(status.arena_id);
               setRole(status.role);
               
               if (status.phase === 'waiting' || status.phase === 'starting') {
                 // Remain in lobby panel
                 setView('lobby');
               } else if (status.phase === 'setup' || status.phase === 'infiltrate') {
                 // Jump into ongoing arena
                 setInitialGameState({
                   phase: status.phase, 
                   time_left: status.time_left, 
                   abilities: status.abilities || []
                 });
                 setView('arena');
               } else {
                 setView('lobby');
               }
               return; // Exit
            }
          } catch(err) {
             console.error("Check status failed", err);
          }

          // Normal login flow
          connectWS(u.username);
          setView('lobby');
        }
      } catch (e) {
        setView('auth');
      }
    };
    if (sessionStorage.getItem('cmd_token')) {
      initAuth();
    } else {
      setView('auth');
    }

    const onAuthExpired = () => {
      setUser(null);
      stopCountdown();
      setView('auth');
      setArenaID(null);
      setRole(null);
    };
    window.addEventListener('auth_expired', onAuthExpired);
    return () => window.removeEventListener('auth_expired', onAuthExpired);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData);
    playerIDRef.current = userData.username;
    connectWS(userData.username);
    setView('lobby');
  }, [connectWS, playerIDRef]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('cmd_token');
    setUser(null);
    stopCountdown();
    setView('auth');
    setArenaID(null);
    setRole(null);
  }, [stopCountdown]);

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
        user={user}
        countdown={countdown}
        phase={phase}
        onLangChange={setLang}
        onSkinChange={setSkin}
        onLogout={handleLogout}
      />

      {view === 'auth' ? (
        <Auth t={t} onLoginSuccess={handleLoginSuccess} />
      ) : view === 'lobby' ? (
        <Lobby
          t={t}
          user={user}
          arenaID={arenaID}
          arenaList={arenaList}
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
