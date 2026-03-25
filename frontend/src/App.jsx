import { useState, useEffect, useRef } from 'react';
import Lobby from './components/Lobby';
import Arena from './components/Arena';
import { i18n } from './i18n';

function App() {
  const [lang, setLang] = useState('ro');
  const [skin, setSkin] = useState('skin-classic');
  const [playerID, setPlayerID] = useState(null);
  const [arenaID, setArenaID] = useState(null);
  const [role, setRole] = useState(null);
  const [phase, setPhase] = useState(null);

  const [wsStatus, setWsStatus] = useState('OFFLINE');
  const [arenaList, setArenaList] = useState([]);
  const [view, setView] = useState('lobby'); // 'lobby' sau 'arena'
  const [setupSecs, setSetupSecs] = useState(0);

  const wsRef = useRef(null);
  const t = i18n[lang];

  // Aplicăm skin-ul pe body când se schimbă
  useEffect(() => {
    document.body.className = skin;
  }, [skin]);

  const connectWS = (id) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws?player_id=${encodeURIComponent(id)}`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('ONLINE');
    ws.onclose = () => {
      setWsStatus('OFFLINE');
      setTimeout(() => connectWS(id), 3000);
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        handleWSEvent(data);
      } catch (e) { console.error(e); }
    };
  };

  const handleWSEvent = (ev) => {
    switch (ev.type) {
      case 'arena_list': setArenaList(ev.payload); break;
      case 'game_start':
        setPhase(ev.payload.phase);
        setSetupSecs(ev.payload.setup_seconds || 90);
        setView('arena'); // Schimbăm vizualizarea spre Arenă!
        break;
      case 'phase_change': setPhase(ev.payload.phase); break;
      case 'game_over':
        // Aici vom trimite un event către componenta Arena mai târziu
        window.dispatchEvent(new CustomEvent('gameOver', { detail: ev.payload }));
        break;
      default: break;
    }
  };

  const identify = (id) => {
    setPlayerID(id);
    connectWS(id);
  };

  return (
      <>
        <header>
          <div className="logo">CMD<span>::</span>ARENA</div>
          <div className="status-bar">
            <select className="header-select" value={skin} onChange={(e) => setSkin(e.target.value)}>
              <option value="skin-classic">SKIN: CLASSIC</option>
              <option value="skin-cyberpunk">SKIN: CYBERPUNK</option>
              <option value="skin-wasteland">SKIN: WASTELAND</option>
              <option value="skin-space">SKIN: DEEP SPACE</option>
            </select>
            <select className="header-select" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="ro">RO</option>
              <option value="en">EN</option>
            </select>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span className="dot" style={{ background: wsStatus === 'ONLINE' ? 'var(--green)' : 'var(--red)' }}></span>
                <span style={{ color: wsStatus === 'ONLINE' ? 'var(--green)' : 'var(--red)' }}>
                {wsStatus === 'ONLINE' ? t.wsOnline : t.wsOffline}
              </span>
              </div>
              {playerID && <div style={{ color: 'var(--green-dim)', marginTop: '.2rem' }}>{'>>'} {playerID}</div>}            </div>
          </div>
        </header>

        {/* RUTELE NOASTRE (Ce afișăm pe ecran) */}
        {view === 'lobby' ? (
            <Lobby
                t={t}
                lang={lang}
                playerID={playerID}
                arenaID={arenaID}
                arenaList={arenaList}
                onIdentify={identify}
                onUpdateArena={(id, role) => { setArenaID(id); setRole(role); }}
                onLeaveArena={() => { setArenaID(null); setRole(null); }}
            />
        ) : (
            <Arena
                t={t}
                arenaID={arenaID}
                playerID={playerID}
                role={role}
                phase={phase}
                setupSecs={setupSecs}
            />
        )}
      </>
  );
}

export default App;