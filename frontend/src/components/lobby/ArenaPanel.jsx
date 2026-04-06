import { useState } from 'react';
import { api } from '../../api';

export function ArenaPanel({ t, user, arenaID, onUpdateArena, onLeaveArena }) {
  const [status,  setStatus]  = useState('');
  const [isReady, setIsReady] = useState(false);
  
  const [arenaName, setArenaName] = useState(`${user?.username || 'Player'}'s Arena`);
  const [arenaType, setArenaType] = useState('casual'); // 'casual' | 'competitive'

  const playerID = user?.username;

  const createArena = async () => {
    try {
      const typeToUse = user?.isGuest ? 'casual' : arenaType;
      const d = await api.createArena(arenaName, typeToUse);
      onUpdateArena(d.arena_id, d.role);
      setStatus(t.statusWaitPeer);
    } catch (e) { 
      console.error(e); 
      setStatus(`Error: ${e.message}`);
    }
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
    <div className="panel top-panel">
      <span className="panel-label">{t.titleArena || '// CREATE COMBAT ARENA'}</span>

      {!arenaID && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
          <div className="field">
            <label>ARENA NAME</label>
            <input 
              type="text" 
              value={arenaName}
              onChange={e => setArenaName(e.target.value)}
              maxLength={30}
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
                  title={user?.isGuest ? "Guests cannot play competitive matches" : ""}
                  style={{ cursor: user?.isGuest ? 'not-allowed' : 'pointer' }}
                />
                COMPETITIVE (ELO)
              </label>
            </div>
          </div>
        </div>
      )}

      {!arenaID && (
        <button className="btn btn-green" onClick={createArena} disabled={!!arenaID}>
          {t.btnCreate || 'INITIALIZE ARENA'}
        </button>
      )}

      {arenaID && (
        <>
          {currentArena && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
              <div className="field">
                <label>ARENA NAME</label>
                <div style={{ padding: '.45rem .65rem', border: '1px solid var(--border)', color: 'var(--green)', fontSize: '.82rem', background: 'rgba(0,0,0,0.4)' }}>
                  {currentArena.name || currentArena.id}
                </div>
              </div>
              <div className="field">
                <label>MATCH TYPE</label>
                <div style={{ display: 'flex', gap: 15, marginTop: 6 }}>
                  <span style={{ fontSize: '.7rem', color: currentArena.type === 'competitive' ? 'var(--amber)' : 'var(--green-dim)' }}>
                    [ {currentArena.type ? currentArena.type.toUpperCase() : 'CASUAL'} ]
                  </span>
                </div>
              </div>
            </div>
          )}
        
          <div style={{ margin: '1rem 0', display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              className="btn"
              style={{ borderColor: 'var(--red)', color: 'var(--red)', width: 'auto' }}
              onClick={leaveArena}
            >
            {t.btnLeave || '[ ABORT ]'}
          </button>
          <button className="btn btn-green" style={{ width: 'auto' }} onClick={setReady} disabled={isReady}>
            {t.btnReady || '[ DEPLOY ]'}
            </button>
          </div>
        </>
      )}

      {status && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5, marginTop: 10 }}>
          {status}
        </div>
      )}
    </div>
  );
}
