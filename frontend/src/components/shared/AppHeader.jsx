import { useEffect } from 'react';
import { SKINS } from '../../constants/skins';
import { formatTime } from '../../hooks/useCountdown';

export function AppHeader({ view, lang, skin, wsStatus, user, countdown, phase, onSkinChange, onLangChange, onLogout }) {
  const isArena = view === 'arena';

  // Apply the skin class to <body> so all body.skin-* CSS selectors activate
  useEffect(() => {
    document.body.className = skin;
    return () => { document.body.className = ''; };
  }, [skin]);
  
  const isInfil = phase === 'infiltrate';
  const phaseColor = isInfil ? 'var(--red)' : 'var(--amber)';
  const wsOnline = wsStatus === 'ONLINE';

  return (
    <header>
      <div className="logo">
        CMD<span>::</span>{isArena ? 'ARENA' : (view === 'auth' ? 'NET' : 'LOBBY')}
      </div>

      <div className="header-center">
        {isArena && countdown > 0 && (
          <span className="header-countdown" style={{ color: phaseColor }}>
            {formatTime(countdown)}
          </span>
        )}
      </div>

      <div className="status-bar">
        <select className="header-select" value={skin} onChange={e => onSkinChange(e.target.value)}>
          {SKINS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select className="header-select" value={lang} onChange={e => onLangChange(e.target.value)}>
          <option value="en">EN</option>
          <option value="ro">RO</option>
        </select>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            {user && (
              <button 
                onClick={onLogout} 
                style={{ 
                  background: 'transparent', border: '1px solid #a03030', color: '#a03030', 
                  fontSize: 10, padding: '2px 6px', cursor: 'pointer' 
                }}
              >
                LOGOUT
              </button>
            )}
            <span className="dot" style={{ background: wsOnline ? 'var(--green)' : 'var(--red)' }} />
            <span style={{ color: wsOnline ? 'var(--green)' : 'var(--red)' }}>
              {wsOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          {user && (
            <div style={{ color: 'var(--green-dim)', marginTop: '.2rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <span>{'>>'} {user.username}</span>
              {user.isGuest ? (
                <span style={{ color: 'var(--text-dim)' }}>(GUEST)</span>
              ) : (
                <span style={{ color: 'var(--amber)' }}>ELO: {user.elo}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
