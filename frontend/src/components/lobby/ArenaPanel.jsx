import { useState } from 'react';
import { api } from '../../api';

export function ArenaPanel({ t, playerID, arenaID, onUpdateArena, onLeaveArena }) {
  const [status,  setStatus]  = useState('');
  const [isReady, setIsReady] = useState(false);

  const createArena = async () => {
    try {
      const d = await api.createArena(playerID);
      onUpdateArena(d.arena_id, d.role);
      setStatus(t.statusWaitPeer);
    } catch (e) { console.error(e); }
  };

  const leaveArena = async () => {
    try {
      await api.leaveArena(arenaID, playerID);
      onLeaveArena();
      setIsReady(false);
      setStatus('');
    } catch (e) { console.error(e); }
  };

  const setReady = async () => {
    try {
      await api.setReady(arenaID, playerID);
      setIsReady(true);
      setStatus(t.statusPrep);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="panel">
      <span className="panel-label">{t.titleArena}</span>

      <button className="btn btn-green" onClick={createArena} disabled={!!arenaID}>
        {t.btnCreate}
      </button>

      {arenaID && (
        <div style={{ margin: '1rem 0', display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            className="btn"
            style={{ borderColor: 'var(--red)', color: 'var(--red)', width: 'auto' }}
            onClick={leaveArena}
          >
            {t.btnLeave}
          </button>
          <button className="btn btn-green" style={{ width: 'auto' }} onClick={setReady} disabled={isReady}>
            {t.btnReady}
          </button>
        </div>
      )}

      {status && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
          {status}
        </div>
      )}
    </div>
  );
}
