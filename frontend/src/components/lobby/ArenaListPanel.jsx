import { useState } from 'react';
import { api } from '../../api';

export function ArenaListPanel({ t, user, arenaID, arenaList, onUpdateArena }) {
  const [selectedID,   setSelectedID]   = useState(null);
  const [errorStatus,  setErrorStatus]  = useState('');
  const [loading,      setLoading]      = useState(false);

  const joinSelected = async () => {
    if (!selectedID || loading) return;
    setErrorStatus('');
    setLoading(true);
    try {
      const d = await api.joinArena(selectedID);
      onUpdateArena(d.arena_id, d.role);
    } catch (e) {
      setErrorStatus(e.message || 'Failed to join arena');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try { await api.arenas(); } catch (e) { console.error(e); }
  };

  const selectedArena = arenaList.find(a => a.id === selectedID);

  // Disable join if: already in an arena, nothing selected, guest trying competitive, arena full
  const canJoin = selectedArena
    && !(user?.isGuest && selectedArena.type === 'competitive')
    && !selectedArena.has_guest
    && selectedArena.host_id !== user?.username;

  const joinDisabledReason = !selectedArena
    ? 'Select an arena first'
    : arenaID
    ? 'You are already in an arena'
    : selectedArena.host_id === user?.username
    ? 'This is your arena'
    : selectedArena.has_guest
    ? 'Arena is full'
    : user?.isGuest && selectedArena.type === 'competitive'
    ? 'Guests cannot join competitive matches'
    : '';

  return (
    <div className="panel top-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <span className="panel-label">{t.titleList || '// AVAILABLE ARENAS'}</span>

      <div className="scrollable-list">
        {arenaList.length === 0 ? (
          <div className="empty-list">
            {t.noArenas || 'No active arenas.'}
          </div>
        ) : (
          <div className="arena-list">
            {arenaList.map(a => (
              <div
                key={a.id}
                className={`arena-item ${a.id === selectedID ? 'selected' : ''} ${a.has_guest ? 'arena-full' : ''}`}
                onClick={() => setSelectedID(a.id)}
                style={{ opacity: a.has_guest ? 0.55 : 1 }}
              >
                <div>
                  <div className="arena-id" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span>{a.name || a.id}</span>
                    <span style={{
                      backgroundColor: a.type === 'competitive' ? 'var(--amber-dim)' : 'var(--green-dim)',
                      color: '#000', padding: '1px 4px', borderRadius: 2,
                      fontSize: '0.55rem', fontWeight: 'bold', textTransform: 'uppercase'
                    }}>{a.type || 'casual'}</span>
                    {a.has_guest && (
                      <span style={{
                        backgroundColor: 'rgba(200,50,50,0.2)', color: 'var(--red)',
                        border: '1px solid var(--red)', padding: '1px 4px', borderRadius: 2,
                        fontSize: '0.55rem', fontWeight: 'bold'
                      }}>FULL</span>
                    )}
                  </div>
                  <div className="arena-players">
                    HOST: <span style={{ color: 'var(--green)' }}>{a.host_id || 'n/a'}</span>
                    {' '}· GUEST:{' '}
                    {a.has_guest ? (
                      <span style={{ color: 'var(--amber)' }}>{a.guest_id || '?'}</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>waiting...</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: '.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn btn-amber"
          style={{ width: 'auto' }}
          onClick={joinSelected}
          disabled={!!arenaID || !canJoin || loading}
          title={joinDisabledReason}
        >
          {loading ? '...' : (t.btnJoin || '[ JOIN ]')}
        </button>
        <button className="btn" style={{ width: 'auto', borderColor: 'var(--text-dim)', color: 'var(--text-dim)' }} onClick={refresh}>
          {t.btnRefresh || '[ ↻ REFRESH ]'}
        </button>
      </div>

      {errorStatus && (
        <div style={{ color: 'var(--red)', fontSize: '.72rem', marginTop: 8, padding: '5px 8px', border: '1px solid var(--red)', borderRadius: 3 }}>
          ✗ {errorStatus}
        </div>
      )}

      {selectedArena && joinDisabledReason && !arenaID && (
        <div style={{ color: 'var(--text-dim)', fontSize: '.68rem', marginTop: 6, fontStyle: 'italic' }}>
          {joinDisabledReason}
        </div>
      )}
    </div>
  );
}
