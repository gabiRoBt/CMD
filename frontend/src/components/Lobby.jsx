import { useState } from 'react';

export default function Lobby({ t, tAlt, bt, lang, playerID, arenaID, arenaList, onIdentify, onUpdateArena, onLeaveArena }) {
    const [inputName, setInputName] = useState('');
    const [selectedArenaID, setSelectedArenaID] = useState(null);
    const [readyStatus, setReadyStatus] = useState('');
    const [isReady, setIsReady] = useState(false);

    // Fallback if bt not passed
    const bitext = bt || ((key) => t[key] || key);

    const handleIdentify = () => {
        if (!inputName.trim()) return alert(t.errName);
        onIdentify(inputName.trim().replace(/\s+/g, '_'));
    };

    const createArena = async () => {
        try {
            const r = await fetch('/api/arena/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ player_id: playerID }) });
            const d = await r.json();
            onUpdateArena(d.arena_id, d.role);
            setReadyStatus(bitext('statusWaitPeer'));
        } catch(e) { console.error(e); }
    };

    const joinSelected = async () => {
        if (!selectedArenaID) return;
        try {
            const r = await fetch('/api/arena/join', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ arena_id: selectedArenaID, player_id: playerID }) });
            const d = await r.json();
            onUpdateArena(d.arena_id, d.role);
            setReadyStatus(bitext('statusReadyGo'));
        } catch(e) { console.error(e); }
    };

    const leaveArena = async () => {
        try {
            await fetch('/api/arena/leave', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ arena_id: arenaID, player_id: playerID }) });
            onLeaveArena(); setIsReady(false); setReadyStatus('');
        } catch(e) { console.error(e); }
    };

    const setReady = async () => {
        try {
            await fetch('/api/arena/ready', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ arena_id: arenaID, player_id: playerID }) });
            setIsReady(true); setReadyStatus(bitext('statusPrep'));
        } catch(e) { console.error(e); }
    };

    const refreshArenas = async () => { await fetch('/api/arenas'); };

    return (
        <div className="container">
            <div>
                {!playerID ? (
                    <div className="panel">
                        <span className="panel-label">{bitext('titleLobby')}</span>
                        <div className="field">
                            <label>{bitext('lblCallsign')}</label>
                            <input
                                type="text"
                                value={inputName}
                                onChange={e => setInputName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleIdentify()}
                                placeholder="ex: ghost_r00t"
                                maxLength="24"
                            />
                        </div>
                        <button className="btn btn-green" onClick={handleIdentify}>
                            {bitext('btnConnect')}
                        </button>
                    </div>
                ) : (
                    <div className="panel">
                        <span className="panel-label">{bitext('titleArena')}</span>
                        <button className="btn btn-green" onClick={createArena} disabled={arenaID != null}>
                            {bitext('btnCreate')}
                        </button>
                        <button className="btn btn-amber" onClick={joinSelected} disabled={arenaID != null || !selectedArenaID}>
                            {bitext('btnJoin')}
                        </button>

                        {arenaID && (
                            <div style={{ margin:'1rem 0', textAlign:'center', display:'flex', gap:'10px', justifyContent:'center' }}>
                                <button className="btn" onClick={leaveArena}
                                        style={{ borderColor:'var(--red)', color:'var(--red)', width:'auto' }}>
                                    {bitext('btnLeave')}
                                </button>
                                <button className="btn btn-green" onClick={setReady} disabled={isReady}
                                        style={{ width:'auto' }}>
                                    {bitext('btnReady')}
                                </button>
                            </div>
                        )}
                        <div style={{ fontSize:'0.75rem', color:'var(--text-dim)', textAlign:'center', lineHeight:'1.5' }}>
                            {readyStatus}
                        </div>
                    </div>
                )}
            </div>

            <div>
                <div className="panel">
                    <span className="panel-label">{bitext('titleList')}</span>
                    <div className="arena-list">
                        {arenaList.length === 0 ? (
                            <div className="empty-list">{bitext('emptyList')}</div>
                        ) : (
                            arenaList.map(a => (
                                <div key={a.id}
                                     className={`arena-item ${a.id === selectedArenaID ? 'selected' : ''}`}
                                     onClick={() => setSelectedArenaID(a.id)}>
                                    <div>
                                        <div className="arena-id">{a.id.slice(0, 32)}</div>
                                        <div className="arena-players">
                                            {bitext('hostText')} <span style={{ color:'var(--green)' }}>{a.host_id}</span>
                                            {' · '}
                                            {bitext('guestText')} {a.has_guest
                                            ? <span style={{ color:'var(--green-dim)' }}>{a.guest_id}</span>
                                            : <span style={{ color:'var(--text-dim)' }}>{bitext('waitText')}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button className="btn btn-amber" onClick={refreshArenas}
                            style={{ width:'auto', marginTop:'.8rem' }}>
                        {bitext('btnRefresh')}
                    </button>
                </div>
            </div>
        </div>
    );
}