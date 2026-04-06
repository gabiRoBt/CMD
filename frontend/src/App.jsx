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

  // ── Lobby state ──────────────────────────────────────────────────────────
  const [arenaList, setArenaList] = useState([]);
  const [arenaID,   setArenaID]   = useState(null);
  const [role,      setRole]      = useState(null);

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
    onGameStart,
  });

  // Extend WS handler to also update lobby arena list
  const onWSEvent = useCallback((ev) => {
    if (ev.type === 'arena_list') setArenaList(ev.payload ?? []);
    handleWSEvent(ev);
  }, [handleWSEvent]);

  const { connect: connectWS } = useWebSocket(onWSEvent, setWsStatus);

  // ── Auth initialization ──────────────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        const u = await api.me();
        if (u && u.username) {
          // Inainte sa facem login success direct in lobby, verificam daca sunt intr-un meci
          try {
            const status = await api.myArenaStatus();
            if (status && status.in_arena) {
               // Reseteaza conexiunea si trimit direct in arena
               setUser({ username: u.username, isGuest: u.is_guest, elo: u.elo || 0 });
               playerIDRef.current = u.username;
               connectWS(u.username);
               setArenaID(status.arena_id);
               setRole(status.role);
               setView('arena');
               return; // Exit
            }
          } catch(err) {
             // Daca esueaza verificare, continuam standard in lobby
          }

          handleLoginSuccess({ username: u.username, isGuest: u.is_guest, elo: u.elo || 0 });
        }
      } catch (e) {
        setView('auth');
      }
    };
    if (localStorage.getItem('cmd_token')) {
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
    localStorage.removeItem('cmd_token');
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
