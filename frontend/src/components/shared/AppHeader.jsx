import { useEffect, useState } from 'react';
import { SKINS } from '../../constants/skins';
import { formatTime } from '../../hooks/useCountdown';
import { isMusicMuted, toggleMusicMute, isSfxMuted, toggleSfxMute } from '../../utils/sounds';

export function AppHeader({ view, lang, skin, wsStatus, user, countdown, phase, onSkinChange, onLangChange, onLogout, t }) {
  const isArena = view === 'arena';
  const [showAudio, setShowAudio] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(isMusicMuted());
  const [sfxMuted, setSfxMuted] = useState(isSfxMuted());

  // Apply the skin class to <body> so all body.skin-* CSS selectors activate
  useEffect(() => {
    document.body.className = skin;
    return () => { document.body.className = ''; };
  }, [skin]);
  
  useEffect(() => {
    const handleOutClick = (e) => {
      if (!e.target.closest('.audio-dropdown')) setShowAudio(false);
    };
    document.addEventListener('click', handleOutClick);
    return () => document.removeEventListener('click', handleOutClick);
  }, []);

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
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <select className="header-select" value={skin} onChange={e => onSkinChange(e.target.value)}>
            {SKINS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <select className="header-select" value={lang} onChange={e => onLangChange(e.target.value)}>
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="ro">RO</option>
          </select>

          <div className="audio-dropdown" style={{ position: 'relative', display: 'flex' }}>
            <button
              className="header-select"
              onClick={() => setShowAudio(!showAudio)}
              style={{
                color: 'var(--green)',
                width: '60px',
                textAlign: 'center',
                padding: '0.2rem 0',
                borderRadius: 0
              }}
            >
              {t?.audioBtn || 'AUDIO'}
            </button>

            {showAudio && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.4rem', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', zIndex: 100, minWidth: '90px' }}>
                <button
                  className="header-select"
                  onClick={(e) => { e.stopPropagation(); setBgmMuted(toggleMusicMute()); }}
                  style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, padding: '0.4rem', color: bgmMuted ? 'var(--red)' : 'var(--green)', width: '100%', textAlign: 'left' }}
                >
                  {t?.musicLbl || 'MUSIC'}: {bgmMuted ? (t?.volOff?.split(' ')[1] || 'OFF') : (t?.volOn?.split(' ')[1] || 'ON')}
                </button>
                <button
                  className="header-select"
                  onClick={(e) => { e.stopPropagation(); setSfxMuted(toggleSfxMute()); }}
                  style={{ border: 'none', borderRadius: 0, padding: '0.4rem', color: sfxMuted ? 'var(--red)' : 'var(--green)', width: '100%', textAlign: 'left' }}
                >
                  {t?.sfxLbl || 'SFX'}: {sfxMuted ? (t?.volOff?.split(' ')[1] || 'OFF') : (t?.volOn?.split(' ')[1] || 'ON')}
                </button>
              </div>
            )}
          </div>
        </div>

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
                {t?.btnLogout || 'LOGOUT'}
              </button>
            )}
            <span className="dot" style={{ background: wsOnline ? 'var(--green)' : 'var(--red)' }} />
            <span style={{ color: wsOnline ? 'var(--green)' : 'var(--red)' }}>
              {wsOnline ? (t?.lblOnline || 'ONLINE') : (t?.lblOffline || 'OFFLINE')}
            </span>
          </div>
          {user && (
            <div style={{ color: 'var(--green-dim)', marginTop: '.2rem', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <span>{'>>'} {user.username}</span>
              {user.isGuest ? (
                <span style={{ color: 'var(--text-dim)' }}>{t?.lblGuestUpper || '(GUEST)'}</span>
              ) : (
                <span style={{ color: 'var(--amber)' }}>{t?.lblElo || 'ELO'}: {user.elo}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
