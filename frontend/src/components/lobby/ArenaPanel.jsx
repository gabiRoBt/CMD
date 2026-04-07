import { useState } from 'react';
import { api } from '../../api';

export function ArenaPanel({ t, user, arenaID, currentArena, arenaList, onUpdateArena, onLeaveArena }) {
  const [status,   setStatus]   = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [isReady,  setIsReady]  = useState(false);

  const [arenaName, setArenaName] = useState(`${user?.username || 'Player'}'s Arena`);
  const [arenaType, setArenaType] = useState('casual');

  const playerID = user?.username;

  const createArena = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const typeToUse = user?.isGuest ? 'casual' : arenaType;
      const d = await api.createArena(arenaName, typeToUse);
      onUpdateArena(d.arena_id, d.role);
      setStatus(t.statusWaitPeer || 'Waiting for opponent...');
    } catch (e) {
      setError(e.message || 'Failed to create arena');
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
      setError(e.message || 'Failed to leave');
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
      setError(e.message || 'Failed to set ready');
    } finally {
      setLoading(false);
    }
  };

  // Derive if the current arena has a guest (so we can show "waiting" vs "opponent joined")
  const hasGuest = currentArena?.has_guest;
  const isHost   = currentArena?.host_id === playerID;

  return (
    <div className="panel top-panel">
      <span className="panel-label">{t.titleArena || '// CREATE COMBAT ARENA'}</span>

      {/* ── NO ARENA: show create form ── */}
      {!arenaID && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
            <div className="field">
              <label>ARENA NAME</label>
              <input
                type="text"
                value={arenaName}
                onChange={e => setArenaName(e.target.value)}
                maxLength={30}
                placeholder="e.g. Gabi's Arena"
              />
            </div>
            <div className="field">
              <label>MATCH TYPE</label>
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
                  CASUAL
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
                    title={user?.isGuest ? 'Guests cannot play competitive matches' : ''}
                    style={{ cursor: user?.isGuest ? 'not-allowed' : 'pointer' }}
                  />
                  COMPETITIVE (ELO)
                </label>
              </div>
            </div>
          </div>

          <button className="btn btn-green" onClick={createArena} disabled={loading}>
            {loading ? '...' : (t.btnCreate || 'INITIALIZE ARENA')}
          </button>
        </>
      )}

      {/* ── IN ARENA: show arena info + ready/leave ── */}
      {arenaID && (
        <>
          {/* Arena info card */}
          <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: 'var(--green)', fontWeight: 'bold', fontSize: '.85rem' }}>
                {currentArena?.name || arenaID}
              </span>
              <span style={{
                backgroundColor: (currentArena?.type || arenaType) === 'competitive' ? 'var(--amber-dim)' : 'var(--green-dim)',
                color: '#000', padding: '2px 6px', borderRadius: 3, fontSize: '.6rem', fontWeight: 'bold', textTransform: 'uppercase'
              }}>
                {currentArena?.type || arenaType}
              </span>
            </div>

            {/* Players status */}
            <div style={{ fontSize: '.72rem', color: 'var(--text-dim)', lineHeight: 1.9 }}>
              <div>
                HOST:{' '}
                <span style={{ color: 'var(--green)' }}>{currentArena?.host_id || playerID}</span>
                {isHost && ' (you)'}
                {isReady && isHost && <span style={{ color: 'var(--green)', marginLeft: 6 }}>✓ READY</span>}
              </div>
              <div>
                GUEST:{' '}
                {hasGuest ? (
                  <span style={{ color: 'var(--amber)' }}>
                    {currentArena?.guest_id}
                    {!isHost && ' (you)'}
                    {isReady && !isHost && <span style={{ color: 'var(--green)', marginLeft: 6 }}>✓ READY</span>}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>waiting...</span>
                )}
              </div>
            </div>
          </div>

          {/* Waiting hint when no guest yet */}
          {!hasGuest && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '.72rem', marginBottom: 12, padding: '8px', border: '1px dashed var(--border)', borderRadius: 4 }}>
              ⏳ Waiting for opponent to join...
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              className="btn"
              style={{ borderColor: 'var(--red)', color: 'var(--red)', width: 'auto' }}
              onClick={leaveArena}
              disabled={loading}
            >
              {t.btnLeave || '[ ABORT ]'}
            </button>
            <button
              className="btn btn-green"
              style={{ width: 'auto' }}
              onClick={setReady}
              disabled={isReady || !hasGuest || loading}
              title={!hasGuest ? 'Waiting for opponent to join first' : ''}
            >
              {isReady ? '✓ READY' : (t.btnReady || '[ DEPLOY ]')}
            </button>
          </div>
        </>
      )}

      {/* Status message */}
      {status && !error && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5, marginTop: 12 }}>
          {status}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{ fontSize: '.75rem', color: 'var(--red)', textAlign: 'center', lineHeight: 1.5, marginTop: 12, padding: '6px', border: '1px solid var(--red)', borderRadius: 3 }}>
          ✗ {error}
        </div>
      )}
    </div>
  );
}
