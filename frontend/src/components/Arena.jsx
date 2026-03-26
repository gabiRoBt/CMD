import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function Arena({ t, arenaID, playerID, role, phase, setupSecs }) {
    const [countdown, setCountdown] = useState(setupSecs || 90);
    const [hpPlayer, setHpPlayer] = useState(100);
    const [hpEnemy, setHpEnemy] = useState(100);
    const [cds, setCds] = useState([0, 0, 0]);
    const [notif, setNotif] = useState({ show: false, msg: '' });
    const [gameOverInfo, setGameOverInfo] = useState(null);

    const termBodyRef = useRef(null);
    const termWinRef = useRef(null);
    const arenaRef = useRef(null);
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const fitAddonRef = useRef(null);

    // 1. Countdown
    useEffect(() => {
        setCountdown(setupSecs || 90);
        const interval = setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [setupSecs, phase]);

    // 2. Cooldown-uri
    useEffect(() => {
        const interval = setInterval(() => {
            setCds(prevCds => prevCds.map(cd => (cd > 0 ? cd - 1 : 0)));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // 3. Terminal Xterm.js
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
        const ws = new WebSocket(`${proto}://${location.host}/ws/terminal?arena_id=${arenaID}&player_id=${playerID}`);
        wsRef.current = ws;

        ws.onmessage = (event) => term.write(event.data);
        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            ws.close();
        };
    }, [arenaID, playerID, phase]);

    // 4. ResizeObserver — re-fit terminal la resize
    useEffect(() => {
        if (!termWinRef.current) return;
        const ro = new ResizeObserver(() => {
            try { fitAddonRef.current?.fit(); } catch (_) {}
        });
        ro.observe(termWinRef.current);
        return () => ro.disconnect();
    }, []);

    // 5. Drag terminal prin titlebar
    useEffect(() => {
        const win = termWinRef.current;
        const handle = document.getElementById('term-drag-handle');
        if (!win || !handle || !arenaRef.current) return;

        let dragging = false;
        let ox = 0, oy = 0;

        const onMouseDown = (e) => {
            if (e.target.closest('.resize-hint')) return;
            dragging = true;
            const rect = win.getBoundingClientRect();
            ox = e.clientX - rect.left;
            oy = e.clientY - rect.top;
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!dragging) return;
            const ar = arenaRef.current.getBoundingClientRect();
            let newX = e.clientX - ar.left - ox;
            let newY = e.clientY - ar.top - oy;
            newX = Math.max(0, Math.min(ar.width - win.offsetWidth, newX));
            newY = Math.max(32, Math.min(ar.height - win.offsetHeight, newY));
            win.style.left = `${newX}px`;
            win.style.top = `${newY}px`;
        };

        const onMouseUp = () => { dragging = false; };

        handle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        return () => {
            handle.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    // 6. Game Over
    useEffect(() => {
        const handleGameOver = (e) => {
            const payload = e.detail;
            setGameOverInfo({
                won: payload.you_won,
                title: payload.you_won ? t.winTitle : t.loseTitle
            });
            setCountdown(0);
            if (wsRef.current) wsRef.current.close();
        };
        window.addEventListener('gameOver', handleGameOver);
        return () => window.removeEventListener('gameOver', handleGameOver);
    }, [t]);

    const formatTime = (secs) => {
        const m = String(Math.floor(secs / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const showNotif = (msg) => {
        setNotif({ show: true, msg });
        setTimeout(() => setNotif({ show: false, msg: '' }), 3000);
    };

    const abilitiesInfo = [
        { cd: 20, effect: t.abStrikeEf,   icon: '🚀', name: 'Strike',   color: '#C0A050' },
        { cd: 30, effect: t.abScrambleEf, icon: '🌀', name: 'Scramble', color: '#C0704A' },
        { cd: 45, effect: t.abShieldEf,   icon: '🛡️', name: 'Shield',   color: '#4A8C42' },
    ];

    const useAbility = async (idx) => {
        if (phase !== 'infiltrate') { showNotif(t.notifOnlyInfil); return; }
        if (cds[idx] > 0) return;

        setCds(prev => { const next = [...prev]; next[idx] = abilitiesInfo[idx].cd; return next; });
        fireStrikeAnimation(idx);
        showNotif(abilitiesInfo[idx].effect);

        try {
            await fetch('/api/ability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arena_id: arenaID, player_id: playerID, ability_id: idx })
            });
        } catch (e) { console.error(e); }
    };

    // Animație din centrul bazei stângi spre centrul bazei drepte
    const fireStrikeAnimation = (idx) => {
        if (!canvasRef.current || !arenaRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const arena = arenaRef.current;

        canvas.width = arena.offsetWidth;
        canvas.height = arena.offsetHeight;

        // Baza stângă: left=8%, width=20% → centru X = 8% + 10% = 18%
        // bottom=15%, aspect-ratio 1:1, width=20% → height ≈ 20% din lățime
        // centru Y ≈ bottom 15% + jumătate din înălțimea bazei
        const sx = arena.offsetWidth * 0.18;
        const sy = arena.offsetHeight * 0.73;

        // Baza dreaptă: right=8%, width=20% → centru X = 100% - 8% - 10% = 82%
        const tx = arena.offsetWidth * 0.82;
        const ty = arena.offsetHeight * 0.73;

        const col = abilitiesInfo[idx]?.color || '#C0A050';
        const trailPoints = [];
        let tick = 0;
        const totalTicks = 52;

        const interval = setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            tick++;
            const prog = tick / totalTicks;
            const ease = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
            const cx = sx + (tx - sx) * ease;
            const cy = sy + (ty - sy) * ease - Math.sin(prog * Math.PI) * (arena.offsetHeight * 0.40);

            trailPoints.push({ x: cx, y: cy });
            if (trailPoints.length > 22) trailPoints.shift();

            // Trail fade
            trailPoints.forEach((p, i) => {
                const alpha = (i / trailPoints.length) * 0.55;
                const r = 1.5 + (i / trailPoints.length) * 3.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = col + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                ctx.fill();
            });

            // Projectil cu glow
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = col;
            ctx.shadowBlur = 16;
            ctx.shadowColor = col;
            ctx.fill();
            ctx.restore();

            if (tick >= totalTicks) {
                clearInterval(interval);
                let ring = 0;
                const explode = setInterval(() => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ring++;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(tx, ty, ring * 10, 0, Math.PI * 2);
                    ctx.strokeStyle = col;
                    ctx.lineWidth = 2.5;
                    ctx.globalAlpha = Math.max(0, 1 - ring * 0.26);
                    ctx.stroke();
                    ctx.restore();
                    if (ring >= 4) {
                        clearInterval(explode);
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                }, 70);
            }
        }, 16);
    };

    return (
        <div id="arena" ref={arenaRef} style={{ display: 'block' }}>

            {/* FUNDALURI */}
            <div className="top-band"></div>
            <div className="band-separator"></div>
            <div className="bottom-band"></div>

            {/* SPRITE-URI */}
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

            {/* CANVAS ANIMAȚII */}
            <canvas id="strike-canvas" ref={canvasRef}></canvas>

            {/* PHASE BAR */}
            <div id="phase-bar">
                <span className="phase-label">CMD::ARENA</span>
                <span id="phase-name" style={{ color: phase === 'infiltrate' ? '#C0704A' : '#4A8C42' }}>
                    {phase === 'infiltrate' ? t.phaseInfil : t.phaseSetup}
                </span>
                <span id="countdown" style={{ color: phase === 'infiltrate' ? '#C0704A' : '#C0A050' }}>
                    {formatTime(countdown)}
                </span>
            </div>

            {/* HP BARS */}
            <div className="hp-bar-wrap" id="hp-player">
                <span className="hp-label">{t.lblSysYou}</span>
                <div className="hp-track"><div className="hp-fill" style={{ width: `${hpPlayer}%` }}></div></div>
            </div>
            <div className="hp-bar-wrap" id="hp-enemy">
                <span className="hp-label">{t.lblSysEnemy}</span>
                <div className="hp-track"><div className="hp-fill" style={{ width: `${hpEnemy}%` }}></div></div>
            </div>

            {/*
              TERMINAL — chat bubble atașat vizual de baza stângă
              - resize nativ din colțul dreapta-jos (CSS resize: both)
              - drag prin titlebar
              - coada bubble-ului pointează spre stânga-jos (spre baza stângă)
            */}
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

            {/*
              POUCH — 3 butoane pill ovale lungi
              Poziționate deasupra bazei stângi, fără fundal negru de bară
            */}
            <div id="pouch">
                {abilitiesInfo.map((ab, idx) => (
                    <div
                        key={idx}
                        id={`ab-${idx}`}
                        className={`ability-pill ${cds[idx] > 0 ? 'on-cd' : ''}`}
                        onClick={() => useAbility(idx)}
                        style={{ '--ab-color': ab.color }}
                    >
                        <span className="ab-icon">{ab.icon}</span>
                        <span className="ab-name">{ab.name}</span>
                        {cds[idx] > 0 && <span className="ab-cd-num">{cds[idx]}s</span>}
                        <div className="ab-cd-progress"
                             style={{ width: cds[idx] > 0 ? `${(cds[idx] / ab.cd) * 100}%` : '0%' }}>
                        </div>
                    </div>
                ))}
            </div>

            {/* NOTIF */}
            <div id="notif" className={notif.show ? 'show' : ''}>{notif.msg}</div>

            {/* GAME OVER */}
            {gameOverInfo && (
                <div id="winner-overlay" className="show" style={{ display: 'flex' }}>
                    <div className={`winner-title ${gameOverInfo.won ? 'won' : 'lost'}`}>{gameOverInfo.title}</div>
                    <div className="winner-sub">
                        {gameOverInfo.won ? "Sistemul inamic a fost distrus." : "Sistemul tău a fost compromis."}
                    </div>
                    <button className="btn btn-green"
                            style={{ width: 'auto', padding: '.6rem 2rem' }}
                            onClick={() => window.location.reload()}>
                        {t.btnRestart}
                    </button>
                </div>
            )}
        </div>
    );
}