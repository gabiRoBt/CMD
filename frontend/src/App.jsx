import { useState, useEffect, useRef } from 'react';
import Lobby from './components/Lobby';
import Arena from './components/Arena';
import { i18n } from './i18n';

function App() {
  const [lang, setLang]                   = useState('en');
  const [skin, setSkin]                   = useState('skin-classic');
  const [playerID, setPlayerID]           = useState(null);
  const [arenaID, setArenaID]             = useState(null);
  const [role, setRole]                   = useState(null);
  const [phase, setPhase]                 = useState(null);
  const [wsStatus, setWsStatus]           = useState('OFFLINE');
  const [arenaList, setArenaList]         = useState([]);
  const [view, setView]                   = useState('lobby');
  const [countdown, setCountdown]         = useState(0);
  const [abilities, setAbilities]         = useState([]);
  const [myHP, setMyHP]                   = useState(100);
  const [enemyHP, setEnemyHP]             = useState(100);
  // incomingAbility: set when WE are the target of an ability
  // {name, id} — id is timestamp so useEffect fires every time even for repeated ability
  const [incomingAbility, setIncomingAbility] = useState(null);

  const wsRef        = useRef(null);
  const countdownRef = useRef(null);
  const playerIDRef  = useRef(null);
  const t = i18n[lang];

  useEffect(() => { document.body.className = skin; }, [skin]);

  const startCountdown = (secs) => {
    clearInterval(countdownRef.current);
    setCountdown(secs);
    countdownRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const connectWS = (id) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws?player_id=${encodeURIComponent(id)}`);
    wsRef.current = ws;
    ws.onopen  = () => setWsStatus('ONLINE');
    ws.onclose = () => { setWsStatus('OFFLINE'); setTimeout(() => connectWS(id), 3000); };
    ws.onmessage = (ev) => { try { handleWSEvent(JSON.parse(ev.data)); } catch (e) { console.error(e); } };
  };

  const handleWSEvent = (ev) => {
    switch (ev.type) {
      case 'arena_list':
        setArenaList(ev.payload ?? []);
        break;

      case 'game_start':
        setPhase(ev.payload.phase);
        setAbilities([]);
        setMyHP(100);
        setEnemyHP(100);
        setIncomingAbility(null);
        startCountdown(ev.payload.setup_seconds || 150);
        setView('arena');
        break;

      case 'phase_change':
        setPhase(ev.payload.phase);
        if (ev.payload.phase === 'infiltrate') startCountdown(300);
        break;

      case 'pouch_result':
        setAbilities(ev.payload.abilities ?? []);
        break;

      case 'hp_update': {
        const { target_id, hp, ability } = ev.payload;
        if (target_id === playerIDRef.current) {
          // We are the target — update our HP and trigger incoming animation
          setMyHP(hp);
          if (ability && ability !== 'repair') {
            setIncomingAbility({ name: ability, id: Date.now() });
          }
        } else {
          // Enemy HP changed
          setEnemyHP(hp);
        }
        break;
      }

      case 'game_over':
        window.dispatchEvent(new CustomEvent('gameOver', { detail: ev.payload }));
        clearInterval(countdownRef.current);
        break;

      default:
        break;
    }
  };

  const identify = (id) => {
    playerIDRef.current = id;
    setPlayerID(id);
    connectWS(id);
  };

  const returnToLobby = () => {
    setView('lobby');
    setArenaID(null);
    setRole(null);
    setPhase(null);
    setAbilities([]);
    setCountdown(0);
    setMyHP(100);
    setEnemyHP(100);
    setIncomingAbility(null);
  };

  const phaseColor = phase === 'infiltrate' ? 'var(--red)' : 'var(--amber)';

  return (
      <>
        <header>
          <div className="logo">CMD<span>::</span>ARENA</div>
          <div className="header-center">
            {view === 'arena' && countdown > 0 && (
                <span className="header-countdown" style={{ color: phaseColor }}>{fmt(countdown)}</span>
            )}
          </div>
          <div className="status-bar">
            <select className="header-select" value={skin} onChange={e => setSkin(e.target.value)}>
              <option value="skin-classic">SKIN: SIBERIA</option>
              <option value="skin-wasteland">SKIN: WASTELAND</option>
              <option value="skin-cyberpunk">SKIN: RETRO</option>
              <option value="skin-dev-mode">SKIN: DEV MODE</option>
            </select>
            <select className="header-select" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="en">EN</option>
              <option value="ro">RO</option>
            </select>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span className="dot" style={{ background: wsStatus === 'ONLINE' ? 'var(--green)' : 'var(--red)' }} />
                <span style={{ color: wsStatus === 'ONLINE' ? 'var(--green)' : 'var(--red)' }}>
                {wsStatus === 'ONLINE' ? t.wsOnline : t.wsOffline}
              </span>
              </div>
              {playerID && <div style={{ color: 'var(--green-dim)', marginTop: '.2rem' }}>{'>>'} {playerID}</div>}
            </div>
          </div>
        </header>

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
                myHP={myHP}
                enemyHP={enemyHP}
                incomingAbility={incomingAbility}
                onReturnToLobby={returnToLobby}
            />
        )}
      </>
  );
}

export default App;