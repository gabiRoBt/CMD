import { useState } from 'react';
import { api } from '../../api';

export function ArenaListPanel({ t, playerID, arenaID, arenaList, onUpdateArena }) {
  const [selectedID, setSelectedID] = useState(null);

  const joinSelected = async () => {
    if (!selectedID) return;
    try {
      const d = await api.joinArena(selectedID, playerID);
      onUpdateArena(d.arena_id, d.role);
    } catch (e) { console.error(e); }
  };

  const refresh = () => api.arenas().catch(console.error);

  return (
    <div className="panel">
      <span className="panel-label">{t.titleList}</span>

      <div className="arena-list">
        {arenaList.length === 0 ? (
          <div className="empty-list">{t.emptyList}</div>
        ) : (
          arenaList.map(a => (
            <div
              key={a.id}
              className={`arena-item${a.id === selectedID ? ' selected' : ''}`}
              onClick={() => setSelectedID(a.id)}
            >
              <div className="arena-id">{a.id.slice(0, 32)}</div>
              <div className="arena-players">
                {t.hostText} <span style={{ color: 'var(--green)' }}>{a.host_id}</span>
                {' · '}
                {t.guestText}{' '}
                {a.has_guest
                  ? <span style={{ color: 'var(--green-dim)' }}>{a.guest_id}</span>
                  : <span style={{ color: 'var(--text-dim)' }}>{t.waitText}</span>
                }
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: '.8rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-amber"
          style={{ width: 'auto' }}
          onClick={joinSelected}
          disabled={!!arenaID || !selectedID}
        >
          {t.btnJoin}
        </button>
        <button className="btn btn-amber" style={{ width: 'auto' }} onClick={refresh}>
          {t.btnRefresh}
        </button>
      </div>
    </div>
  );
}
