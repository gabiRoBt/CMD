import { useState } from 'react';

export default function Lobby({ t, playerID, arenaID, arenaList, onIdentify, onUpdateArena, onLeaveArena }) {
    const [inputName, setInputName] = useState('');
    const [selectedArenaID, setSelectedArenaID] = useState(null);
    const [readyStatus, setReadyStatus] = useState('');
    const [isReady, setIsReady] = useState(false);

    const handleIdentify = () => {
        if (!inputName.trim()) return alert(t.errName);
        onIdentify(inputName.trim().replace(/\s+/g, '_'));
    };

    const createArena = async () => {
        try {
            const r = await fetch('/api/arena/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: playerID }) });
            const d = await r.json();
            onUpdateArena(d.arena_id, d.role);
            setReadyStatus(t.statusWaitPeer);
        } catch (e) { console.error(e); }
    };

    const joinSelected = async () => {
        if (!selectedArenaID) return;
        try {
            const r = await fetch('/api/arena/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ arena_id: selectedArenaID, player_id: playerID }) });
            const d = await r.json();
            onUpdateArena(d.arena_id, d.role);
            setReadyStatus(t.statusReadyGo);
        } catch (e) { console.error(e); }
    };

    const leaveArena = async () => {
        try {
            await fetch('/api/arena/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ arena_id: arenaID, player_id: playerID }) });
            onLeaveArena();
            setIsReady(false);
            setReadyStatus('');
        } catch (e) { console.error(e); }
    };

    const setReady = async () => {
        try {
            await fetch('/api/arena/ready', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ arena_id: arenaID, player_id: playerID }) });
            setIsReady(true);
            setReadyStatus(t.statusPrep);
        } catch (e) { console.error(e); }
    };

    const refreshArenas = async () => {
        await fetch('/api/arenas'); // Aceasta forțează backend-ul să dea un broadcast WS
    };

    return (
        <div className="container">
            <div>
                {!playerID ? (
                    <div className="panel">
                        <span className="panel-label">{t.titleLobby}</span>
                        <div className="field">
                            <label>{t.lblCallsign}</label>
                            <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} placeholder="ex: ghost_r00t" maxLength="24" />
                        </div>
                        <button className="btn btn-green" onClick={handleIdentify}>{t.btnConnect}</button>
                    </div>
                ) : (
                    <div className="panel">
                        <span className="panel-label">{t.titleArena}</span>
                        <button className="btn btn-green" onClick={createArena} disabled={arenaID != null}>{t.btnCreate}</button>
                        <button className="btn btn-amber" onClick={joinSelected} disabled={arenaID != null || !selectedArenaID}>{t.btnJoin}</button>

                        {arenaID && (
                            <div style={{ margin: '1rem 0', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button className="btn" onClick={leaveArena} style={{ borderColor: 'var(--red)', color: 'var(--red)', width: 'auto' }}>
                                    {t.btnLeave}
                                </button>
                                <button className="btn btn-green" onClick={setReady} disabled={isReady} style={{ width: 'auto' }}>
                                    {t.btnReady}
                                </button>
                            </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>{readyStatus}</div>
                    </div>
                )}
            </div>

            <div>
                <div className="panel">
                    <span className="panel-label">{t.titleList}</span>
                    <div className="arena-list">
                        {arenaList.length === 0 ? (
                            <div className="empty-list">{t.emptyList}</div>
                        ) : (
                            arenaList.map(a => (
                                <div key={a.id} className={`arena-item ${a.id === selectedArenaID ? 'selected' : ''}`} onClick={() => setSelectedArenaID(a.id)}>
                                    <div>
                                        <div className="arena-id">{a.id.slice(0, 32)}</div>
                                        <div className="arena-players">
                                            {t.hostText} <span style={{ color: 'var(--green)' }}>{a.host_id}</span> · {t.guestText} {a.has_guest ? <span style={{ color: 'var(--green-dim)' }}>{a.guest_id}</span> : <span style={{ color: 'var(--text-dim)' }}>{t.waitText}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button className="btn btn-amber" onClick={refreshArenas} style={{ width: 'auto', marginTop: '.8rem' }}>{t.btnRefresh}</button>
                </div>
            </div>
        </div>
    );
}