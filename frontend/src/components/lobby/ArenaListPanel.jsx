import { useState } from 'react';
import { api } from '../../api';

export function ArenaListPanel({ t, user, arenaID, arenaList, onUpdateArena }) {
  const [selectedID, setSelectedID] = useState(null);
  const [errorStatus, setErrorStatus] = useState('');

  const joinSelected = async () => {
    if (!selectedID) return;
    setErrorStatus('');
    try {
      const d = await api.joinArena(selectedID);
      onUpdateArena(d.arena_id, d.role);
    } catch (e) { 
      console.error(e);
      setErrorStatus(e.message || "Failed to join");
    }
  };

  const refresh = () => api.arenas().catch(console.error);

  const selectedArena = arenaList.find(a => a.id === selectedID);
  
  // Can guest join?
  const canJoin = selectedArena && !(user?.isGuest && selectedArena.type === 'competitive');

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
                className={`arena-item ${a.id === selectedID ? 'selected' : ''}`}
                onClick={() => setSelectedID(a.id)}
              >
                <div>
                  <div className="arena-id">
                    {a.name || a.id} 
                    <span style={{
                      backgroundColor: a.type === 'competitive' ? 'var(--amber-dim)' : 'var(--green-dim)',
                      color: '#000',
                      padding: '1px 4px',
                      borderRadius: '2px',
                      fontSize: '0.55rem',
                      marginLeft: '8px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>{a.type || 'casual'}</span>
                  </div>
                  <div className="arena-players">
                    HOST: <span style={{ color: 'var(--green)' }}>{a.host_id || 'n/a'}</span>
                    {' '}· GUEST: {a.guest_id ? (
                      <span style={{ color: 'var(--red)' }}>{a.guest_id}</span>
                    ) : (
                      'waiting...'
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: '.8rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-amber"
          style={{ width: 'auto' }}
          onClick={joinSelected}
          disabled={!!arenaID || !selectedID || !canJoin}
          title={!canJoin ? "Guests cannot join competitive matches" : ""}
        >
          {t.btnJoin || '[ DEPLOY ]'}
        </button>
        <button className="btn btn-amber" style={{ width: 'auto' }} onClick={refresh}>
           {t.btnRefresh || '[ ↻ ] REFRESH'}
        </button>
      </div>
      {errorStatus && <div style={{ color: '#D04040', fontSize: 11, marginTop: 8 }}>{errorStatus}</div>}
    </div>
  );
}
