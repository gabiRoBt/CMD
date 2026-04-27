import { useState, useEffect } from 'react';
import { api } from '../../api';

export function ArenaPanel({ t, user, arenaID, currentArena, arenaList, onUpdateArena, onLeaveArena }) {
  const [status,   setStatus]   = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [isReady,  setIsReady]  = useState(false);

  const [arenaName, setArenaName] = useState(() => {
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    return `${user?.username || 'Player'}'s Arena #${suffix}`;
  });
  const [arenaType, setArenaType] = useState('casual');

  const playerID = user?.username;

  const [errorKey, setErrorKey] = useState(0);

  const showError = (msg) => {
    setError(msg);
    setErrorKey(k => k + 1);
    setTimeout(() => setError(''), 1500); // clears state matching fade out
  };

  const createArena = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const typeToUse = user?.isGuest ? 'casual' : arenaType;
      const d = await api.createArena(arenaName, typeToUse);
      onUpdateArena(d.arena_id, d.role);
      setStatus(t.statusWaitMatch || 'Waiting for opponent...');
    } catch (e) {
      showError(e.message || 'Failed to create arena');
    } finally {
      setLoading(false);
    }
  };

  const leaveArena = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.leaveArena(arenaID, playerID);
      onLeaveArena();
      setIsReady(false);
      setStatus('');
      setError('');
    } catch (e) {
      showError(e.message || 'Failed to leave');
    } finally {
      setLoading(false);
    }
  };

  const setReady = async () => {
    if (loading || isReady) return;
    setLoading(true);
    try {
      await api.setReady(arenaID, playerID);
      setIsReady(true);
      setStatus(t.statusPrep || 'Ready! Waiting for opponent to ready up...');
    } catch (e) {
      showError(e.message || 'Failed to set ready');
    } finally {
      setLoading(false);
    }
  };

  // Sync internal isReady based on currentArena update from WS
  useEffect(() => {
    if (currentArena && playerID) {
      if (currentArena.host_id === playerID && currentArena.host_ready) setIsReady(true);
      if (currentArena.guest_id === playerID && currentArena.guest_ready) setIsReady(true);
    } else if (arenaID && !currentArena && arenaList.length > 0) {
      // If we are waiting in an arena, but it's no longer in the list, it means the host left / deleted it.
      onLeaveArena();
      setIsReady(false);
      setStatus('');
      showError(t.errHostLeft || 'Host closed the arena');
    }
  }, [currentArena, arenaID, arenaList, playerID, onLeaveArena, t.errHostLeft]);

  // Derive if the current arena has a guest (so we can show "waiting" vs "opponent joined")
  const hasGuest = currentArena?.has_guest;
  const isHost   = currentArena?.host_id === playerID;

  return (
    <div className="panel top-panel">
      <span className="panel-label">{t.titleArena || '// CREATE COMBAT ARENA'}</span>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* === NO ARENA: show create form === */}
        {!arenaID && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
              <div className="field">
                <label>{t.lblArenaName || 'ARENA NAME'}</label>
                <input
                  type="text"
                  value={arenaName}
                  onChange={e => setArenaName(e.target.value)}
                  maxLength={30}
                  placeholder="e.g. Gabi's Arena"
                />
              </div>
              <div className="field">
                <label>{t.lblMatchType || 'MATCH TYPE'}</label>
                <div style={{ display: 'flex', gap: 15, marginTop: 6 }}>
                  <label style={{ fontSize: '.7rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--green-dim)' }}>
                    <input
                      type="radio"
                      className="cmd-radio"
                      name="arenaType"
                      value="casual"
                      checked={arenaType === 'casual' || user?.isGuest}
                      onChange={e => setArenaType(e.target.value)}
                    />
                    {t.lblCasual || 'CASUAL'}
                  </label>
                  <label style={{ fontSize: '.7rem', display: 'flex', alignItems: 'center', gap: 6, cursor: user?.isGuest ? 'not-allowed' : 'pointer', color: 'var(--green-dim)', opacity: user?.isGuest ? 0.4 : 1 }}>
                    <input
                      type="radio"
                      className="cmd-radio"
                      name="arenaType"
                      value="competitive"
                      checked={arenaType === 'competitive' && !user?.isGuest}
                      onChange={e => setArenaType(e.target.value)}
                      disabled={user?.isGuest}
                      title={user?.isGuest ? (t.errGuestComp || 'Guests cannot play competitive matches') : ''}
                      style={{ cursor: user?.isGuest ? 'not-allowed' : 'pointer' }}
                    />
                    {t.lblComp || 'COMPETITIVE (ELO)'}
                  </label>
                </div>
              </div>
            </div>

            {/* Brief Game Overview & Weapons */}
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 4, 
              padding: '12px', marginBottom: 15, fontSize: '0.68rem', color: 'var(--text-dim)'
            }}>
              <div style={{ color: 'var(--green)', marginBottom: 8, fontWeight: 'bold', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.lblSysOverview || '[?] SYSTEM OVERVIEW'}</span>
                <span style={{color: 'var(--green-dim)'}}>v1.0</span>
              </div>
              <p style={{ margin: '0 0 10px 0', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: t.descOverview?.replace('weapon_*.bin', '<span style="color:var(--green)">weapon_*.bin</span>') || '' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.62rem' }}>
                <div style={{ background: 'rgba(0,255,65,0.05)', padding: '6px', border: '1px solid rgba(0,255,65,0.1)', borderRadius: 2 }}>
                  <b style={{color: 'var(--green)', display: 'block', marginBottom: '2px'}}>./scramble</b>
                  {t.descScramble}
                </div>
                <div style={{ background: 'rgba(0,255,65,0.05)', padding: '6px', border: '1px solid rgba(0,255,65,0.1)', borderRadius: 2 }}>
                  <b style={{color: 'var(--green)', display: 'block', marginBottom: '2px'}}>./repair</b>
                  {t.descRepair}
                </div>
                <div style={{ background: 'rgba(0,255,65,0.05)', padding: '6px', border: '1px solid rgba(0,255,65,0.1)', borderRadius: 2 }}>
                  <b style={{color: 'var(--green)', display: 'block', marginBottom: '2px'}}>./reveal</b>
                  {t.descReveal}
                </div>
                <div style={{ background: 'rgba(0,255,65,0.05)', padding: '6px', border: '1px solid rgba(0,255,65,0.1)', borderRadius: 2 }}>
                  <b style={{color: 'var(--green)', display: 'block', marginBottom: '2px'}}>./rocket</b>
                  {t.descRocket}
                </div>
              </div>
            </div>

            <button
              className="btn btn-green"
              onClick={createArena}
              disabled={loading || !arenaName.trim()}
            >
              {t.btnCreate || '[ + ] CREATE ARENA'}
            </button>
          </>
        )}

        {/* === IN ARENA: show details & ready up === */}
        {arenaID && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ border: '1px dashed var(--border)', padding: 15, background: 'rgba(0,255,65,0.02)' }}>
              <div style={{ color: 'var(--green)', marginBottom: 8, fontSize: '.8rem', fontWeight: 'bold' }}>
                {t.lblArenaDetails || '// ARENA DETAILS'}
              </div>
              <div style={{ color: 'var(--text)', marginBottom: 4, wordBreak: 'break-all' }}>
                ID: <span style={{ color: 'var(--green-dim)' }}>{arenaID}</span>
              </div>
              <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>
                {currentArena?.type === 'competitive' ? t.lblTypeComp : t.lblTypeCasual}
              </div>
              <div style={{ color: 'var(--text-dim)' }}>
                {isHost ? t.lblRoleHost : t.lblRoleGuest}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-amber" style={{ flex: 1 }} onClick={leaveArena} disabled={loading}>
                {t.btnLeave || '[ X ] LEAVE'}
              </button>
              {hasGuest && !isReady && (
                <button className="btn btn-green" style={{ flex: 2 }} onClick={setReady} disabled={loading}>
                  {t.btnReady || '[ v ] I AM READY'}
                </button>
              )}
            </div>

            <div style={{ 
              marginTop: 10, 
              color: isReady ? 'var(--green)' : 'var(--amber)',
              fontSize: '.8rem',
              textAlign: 'center',
              fontStyle: 'italic',
              minHeight: '1.2rem'
            }}>
              {status || (!hasGuest ? (t.statusWaitPeer || 'Wait for an opponent...') : (t.statusReadyGo || 'Press I AM READY'))}
            </div>
          </div>
        )}
      </div>

      {/* Status message */}
      {status && !error && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5, marginTop: 12 }}>
          {status}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div key={errorKey} style={{ 
          fontSize: '.75rem', color: 'var(--red)', textAlign: 'center', lineHeight: 1.5, 
          marginTop: 12, padding: '6px', border: '1px solid var(--red)', borderRadius: 3,
          animation: 'fade-out-error 1.5s forwards'
        }}>
          ✗ {error}
        </div>
      )}
      <style>{`
        @keyframes fade-out-error {
          0%, 60% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
