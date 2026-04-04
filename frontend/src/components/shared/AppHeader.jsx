import { SKINS } from '../../constants/skins';
import { formatTime } from '../../hooks/useCountdown';

export function AppHeader({ view, lang, skin, wsStatus, playerID, countdown, phase, onSkinChange, onLangChange }) {
  const isArena    = view === 'arena';
  const isInfil    = phase === 'infiltrate';
  const phaseColor = isInfil ? 'var(--red)' : 'var(--amber)';
  const wsOnline   = wsStatus === 'ONLINE';

  return (
    <header>
      <div className="logo">
        CMD<span>::</span>{isArena ? 'ARENA' : 'LOBBY'}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span className="dot" style={{ background: wsOnline ? 'var(--green)' : 'var(--red)' }}/>
            <span style={{ color: wsOnline ? 'var(--green)' : 'var(--red)' }}>
              {wsOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          {playerID && (
            <div style={{ color: 'var(--green-dim)', marginTop: '.2rem' }}>{'>>'} {playerID}</div>
          )}
        </div>
      </div>
    </header>
  );
}
