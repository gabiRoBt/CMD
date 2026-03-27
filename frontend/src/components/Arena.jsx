import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const ABILITY_DEFS = {
    scramble: { icon: '🌀', name: 'SCRAMBLE', color: '#C0704A', effect: 'ENEMY COMMANDS SCRAMBLED' },
    repair:   { icon: '🔧', name: 'REPAIR',   color: '#4A8C42', effect: 'REPAIR KIT ACTIVATED'     },
    rocket:   { icon: '🚀', name: 'ROCKET',   color: '#C0A050', effect: 'ENEMY INPUT LOCKED — 10s' },
    sonar:    { icon: '📡', name: 'SONAR',    color: '#5A9CB0', effect: 'EMPTY FOLDERS DELETED'    },
};

export default function Arena({ t, arenaID, playerID, role, phase, setupSecs, abilities = [] }) {
    const [usedAbilities, setUsedAbilities] = useState(new Set());
    const [notif, setNotif]     = useState({ show: false, msg: '' });
    const [gameOverInfo, setGameOverInfo] = useState(null);

    const termBodyRef = useRef(null);
    const termWinRef  = useRef(null);
    const arenaRef    = useRef(null);
    const canvasRef   = useRef(null);
    const wsRef       = useRef(null);
    const fitAddonRef = useRef(null);

    // ── xterm.js + SSH WebSocket proxy ────────────────────────────────────
    useEffect(() => {
        if (!termBodyRef.current) return;
        termBodyRef.current.innerHTML = '';

        const term = new Terminal({
            cursorBlink: true,
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: 13,
            theme: { background: 'transparent', foreground: '#00ff41', cursor: '#00ff41' }
        });
        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        term.loadAddon(fitAddon);
        term.open(termBodyRef.current);
        fitAddon.fit();

        term.attachCustomKeyEventHandler((e) => {
            if (e.ctrlKey && e.code === 'KeyC' && e.type === 'keydown') {
                if (term.hasSelection()) {
                    navigator.clipboard.writeText(term.getSelection());
                    term.clearSelection();
                    return false;
                }
                return true;
            }
            if (e.ctrlKey && e.code === 'KeyV' && e.type === 'keydown') return false;
            return true;
        });

        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(
            `${proto}://${location.host}/ws/terminal?arena_id=${arenaID}&player_id=${playerID}`
        );
        wsRef.current = ws;

        // ── FIX CRITIC: binaryType arraybuffer → Uint8Array → xterm ──────
        ws.binaryType = 'arraybuffer';
        ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                term.write(new Uint8Array(event.data));
            } else {
                term.write(event.data);
            }
        };
        ws.onopen  = () => { term.focus(); };
        ws.onerror = (e) => console.error('[terminal ws]', e);
        ws.onclose = () => term.write('\r\n\x1b[31m[conexiune închisă]\x1b[0m\r\n');

        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });

        const handleResize = () => { try { fitAddon.fit(); } catch (_) {} };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            if (ws.readyState <= WebSocket.OPEN) ws.close();
        };
    }, [arenaID, playerID, phase]);

    // ── ResizeObserver ────────────────────────────────────────────────────
    useEffect(() => {
        if (!termWinRef.current) return;
        const ro = new ResizeObserver(() => { try { fitAddonRef.current?.fit(); } catch (_) {} });
        ro.observe(termWinRef.current);
        return () => ro.disconnect();
    }, []);

    // ── Drag: position:fixed față de viewport ─────────────────────────────
    // Poate trece peste header. Blocat la footer (52px de jos).
    useEffect(() => {
        const win    = termWinRef.current;
        const handle = document.getElementById('term-drag-handle');
        if (!win || !handle) return;
        let dragging = false, ox = 0, oy = 0;

        const onDown = (e) => {
            if (e.target.closest('.resize-hint')) return;
            dragging = true;
            const r = win.getBoundingClientRect();
            ox = e.clientX - r.left;
            oy = e.clientY - r.top;
            e.preventDefault();
        };
        const onMove = (e) => {
            if (!dragging) return;
            let nx = e.clientX - ox;
            let ny = e.clientY - oy;
            nx = Math.max(0, Math.min(window.innerWidth  - win.offsetWidth,  nx));
            ny = Math.max(0, Math.min(window.innerHeight - win.offsetHeight - 52, ny));
            win.style.left = `${nx}px`;
            win.style.top  = `${ny}px`;
        };
        const onUp = () => { dragging = false; };

        handle.addEventListener('mousedown', onDown);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            handle.removeEventListener('mousedown', onDown);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, []);

    // ── Game Over ─────────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            const p = e.detail;
            const title = p.draw ? (t.drawTitle || '— REMIZĂ —') : (p.you_won ? t.winTitle : t.loseTitle);
            setGameOverInfo({ won: p.you_won, draw: p.draw, title });
            if (wsRef.current) wsRef.current.close();
        };
        window.addEventListener('gameOver', handler);
        return () => window.removeEventListener('gameOver', handler);
    }, [t]);

    const showNotif = (msg) => {
        setNotif({ show: true, msg });
        setTimeout(() => setNotif({ show: false, msg: '' }), 3000);
    };

    const useAbility = async (name) => {
        if (phase !== 'infiltrate') { showNotif(t.notifOnlyInfil); return; }
        if (usedAbilities.has(name)) return;
        setUsedAbilities(prev => new Set([...prev, name]));
        fireStrikeAnimation(name);
        showNotif(ABILITY_DEFS[name]?.effect || name.toUpperCase());
        try {
            await fetch('/api/ability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arena_id: arenaID, player_id: playerID, ability: name })
            });
        } catch (e) { console.error(e); }
    };

    const fireStrikeAnimation = (name) => {
        if (!canvasRef.current || !arenaRef.current) return;
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        const arena  = arenaRef.current;
        canvas.width  = arena.offsetWidth;
        canvas.height = arena.offsetHeight;
        const sx  = arena.offsetWidth  * 0.18;
        const sy  = arena.offsetHeight * 0.73;
        const tx  = arena.offsetWidth  * 0.82;
        const ty  = arena.offsetHeight * 0.73;
        const col = ABILITY_DEFS[name]?.color || '#C0A050';
        const trail = [];
        let tick = 0;
        const iv = setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            tick++;
            const prog = tick / 52;
            const ease = prog < 0.5 ? 2*prog*prog : -1+(4-2*prog)*prog;
            const cx = sx + (tx-sx)*ease;
            const cy = sy + (ty-sy)*ease - Math.sin(prog*Math.PI)*(arena.offsetHeight*0.40);
            trail.push({ x:cx, y:cy });
            if (trail.length > 22) trail.shift();
            trail.forEach((p, i) => {
                const a = (i/trail.length)*0.55;
                const r = 1.5+(i/trail.length)*3.5;
                ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
                ctx.fillStyle = col+Math.floor(a*255).toString(16).padStart(2,'0');
                ctx.fill();
            });
            ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2);
            ctx.fillStyle=col; ctx.shadowBlur=16; ctx.shadowColor=col;
            ctx.fill(); ctx.restore();
            if (tick>=52) {
                clearInterval(iv);
                let ring=0;
                const ex=setInterval(()=>{
                    ctx.clearRect(0,0,canvas.width,canvas.height); ring++;
                    ctx.save(); ctx.beginPath(); ctx.arc(tx,ty,ring*10,0,Math.PI*2);
                    ctx.strokeStyle=col; ctx.lineWidth=2.5;
                    ctx.globalAlpha=Math.max(0,1-ring*0.26);
                    ctx.stroke(); ctx.restore();
                    if(ring>=4){clearInterval(ex);ctx.clearRect(0,0,canvas.width,canvas.height);}
                },70);
            }
        }, 16);
    };

    return (
        <div className="arena-wrapper">
            <div id="arena" ref={arenaRef}>
                <div className="top-band"></div>
                <div className="band-separator"></div>
                <div className="bottom-band"></div>

                <div className="element-box base-box left-base">
                    <img src="/assets/baza.jpeg" alt="Baza Player" />
                </div>
                <div className="element-box cactus-box">
                    <img src="/assets/cactus.jpeg" alt="Cactus" />
                </div>
                <div className="element-box snake-box">
                    <img src="/assets/sarpe.jpeg" alt="Sarpe" />
                </div>
                <div className="element-box empty-box"></div>
                <div className="element-box base-box right-base">
                    <img src="/assets/baza.jpeg" alt="Baza Inamic" className="mirrored" />
                </div>

                {/* canvas z:10 — proiectile sub terminal z:200 */}
                <canvas id="strike-canvas" ref={canvasRef}></canvas>

                {/* Phase bar — grid 3 coloane aliniat cu headerul */}
                <div id="phase-bar">
                    <span className="phase-label">{playerID ?? '—'}</span>
                    <span id="phase-name" style={{ color: phase === 'infiltrate' ? '#C0704A' : '#4A8C42' }}>
                        {phase === 'infiltrate' ? t.phaseInfil : t.phaseSetup}
                    </span>
                    <span className="phase-nuke">nuke: /bin/nuke_system</span>
                </div>

                <div className="hp-bar-wrap" id="hp-player">
                    <span className="hp-label">{t.lblSysYou}</span>
                    <div className="hp-track"><div className="hp-fill" style={{ width: '100%' }}></div></div>
                </div>
                <div className="hp-bar-wrap" id="hp-enemy">
                    <span className="hp-label">{t.lblSysEnemy}</span>
                    <div className="hp-track"><div className="hp-fill" style={{ width: '100%' }}></div></div>
                </div>

                <div id="notif" className={notif.show ? 'show' : ''}>{notif.msg}</div>

                {gameOverInfo && (
                    <div id="winner-overlay" className="show" style={{ display: 'flex' }}>
                        <div className={`winner-title ${gameOverInfo.draw ? 'draw' : gameOverInfo.won ? 'won' : 'lost'}`}>{gameOverInfo.title}</div>
                        <div className="winner-sub">
                            {gameOverInfo.draw
                                ? 'Timpul a expirat. Niciun sistem nu a fost compromis.'
                                : gameOverInfo.won
                                    ? 'Sistemul inamic a fost distrus.'
                                    : 'Sistemul tău a fost compromis.'}
                        </div>
                        <button className="btn btn-green"
                                style={{ width: 'auto', padding: '.6rem 2rem' }}
                                onClick={() => window.location.reload()}>
                            {t.btnRestart}
                        </button>
                    </div>
                )}
            </div>

            {/* Terminal — position:fixed, z:200, CRT via ::after în CSS */}
            <div id="terminal-win" ref={termWinRef}>
                <div className="term-bubble-tail"></div>
                <div className="term-titlebar" id="term-drag-handle">
                    <div className="term-btns">
                        <span className="term-btn"></span>
                        <span className="term-btn"></span>
                        <span className="term-btn" style={{ background: '#4A8C42' }}></span>
                    </div>
                    <span>{t.termTitle}</span>
                    <span className="resize-hint" title="Drag colț dreapta-jos pentru resize">⤢</span>
                </div>
                <div id="term-body" ref={termBodyRef}
                     style={{ flex: 1, padding: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.85)' }}>
                </div>
            </div>

            <footer id="arena-footer">
                <div className="footer-left">
                    <span className="footer-tag">ARENA</span>
                    <span className="footer-id">{arenaID ?? '—'}</span>
                </div>

                <div id="pouch">
                    {abilities.length === 0 ? (
                        <span className="pouch-empty-msg">
                            {phase === 'setup' ? '[ mv weapon_*.bin ~/pouch/ ]' : '— POUCH EMPTY —'}
                        </span>
                    ) : (
                        abilities.map((name) => {
                            const def  = ABILITY_DEFS[name] || { icon:'?', name:name.toUpperCase(), color:'#666', effect:'' };
                            const used = usedAbilities.has(name);
                            return (
                                <div key={name}
                                     className={`ability-pill${used ? ' used' : ''}`}
                                     onClick={() => useAbility(name)}
                                     style={{ '--ab-color': used ? '#2a2a2a' : def.color }}
                                     title={used ? 'Deja folosit' : def.effect}>
                                    <div className="ab-cd-progress" style={{ width: 0 }} />
                                    <span className="ab-icon">{used ? '—' : def.icon}</span>
                                    <span className="ab-name">{def.name}</span>
                                    {used
                                        ? <span className="ab-used-tag">USED</span>
                                        : <span className="ab-key">[use]</span>}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="footer-right">
                    <span className="footer-tag">ROLE</span>
                    <span className="footer-role" style={{ color: role === 'host' ? '#4A8C42' : '#C0704A' }}>
                        {role?.toUpperCase() ?? '—'}
                    </span>
                </div>
            </footer>
        </div>
    );
}