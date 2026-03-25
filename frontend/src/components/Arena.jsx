import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function Arena({ t, arenaID, playerID, role, phase, setupSecs }) {
    // ── STĂRI (Variables) ──
    const [countdown, setCountdown] = useState(setupSecs || 90);
    const [hpPlayer, setHpPlayer] = useState(100);
    const [hpEnemy, setHpEnemy] = useState(100);
    const [cds, setCds] = useState([0, 0, 0, 0]); // Cooldown-urile celor 4 abilități
    const [notif, setNotif] = useState({ show: false, msg: '' });
    const [gameOverInfo, setGameOverInfo] = useState(null);

    // ── REFERINȚE (DOM Elements) ──
    const termBodyRef = useRef(null);
    const termWinRef = useRef(null);
    const arenaRef = useRef(null);
    const canvasRef = useRef(null);
    const wsRef = useRef(null);

    // 1. Logica de Countdown
    useEffect(() => {
        setCountdown(setupSecs || 90);
        const interval = setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [setupSecs, phase]);

    // 2. Logica de Cooldown-uri pentru Abilități
    useEffect(() => {
        const interval = setInterval(() => {
            setCds(prevCds => prevCds.map(cd => (cd > 0 ? cd - 1 : 0)));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // 3. Inițializarea Terminalului Xterm.js
    useEffect(() => {
        if (!termBodyRef.current) return;
        termBodyRef.current.innerHTML = ''; // Curățăm vechiul terminal

        const term = new Terminal({
            cursorBlink: true,
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: 13,
            theme: { background: 'transparent', foreground: '#00ff41', cursor: '#00ff41' }
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termBodyRef.current);
        fitAddon.fit();

        // Copy / Paste inteligent
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

        // Conexiunea WebSocket
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${proto}://${location.host}/ws/terminal?arena_id=${arenaID}&player_id=${playerID}`);
        wsRef.current = ws;

        ws.onmessage = (event) => term.write(event.data);
        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });

        // Redimensionare terminal când se schimbă fereastra
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            ws.close();
        };
    }, [arenaID, playerID, phase]); // Se re-inițializează automat când treci din Setup în Infiltrate!

    // 4. Drag & Drop pentru Terminal
    useEffect(() => {
        const win = termWinRef.current;
        const handle = document.getElementById('term-drag-handle');
        if (!win || !handle || !arenaRef.current) return;

        let dragging = false;
        let ox = 0, oy = 0;

        const onMouseDown = (e) => {
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

            // Nu lăsăm terminalul să iasă din ecran
            newX = Math.max(0, Math.min(ar.width - win.offsetWidth, newX));
            newY = Math.max(32, Math.min(ar.height - win.offsetHeight - 80, newY));

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

    // 5. Ascultăm evenimentul de Game Over
    useEffect(() => {
        const handleGameOver = (e) => {
            const payload = e.detail;
            setGameOverInfo({
                won: payload.you_won,
                title: payload.you_won ? t.winTitle : t.loseTitle
            });
            // Oprim timer-ul și deconectăm terminalul
            setCountdown(0);
            if (wsRef.current) wsRef.current.close();
        };

        window.addEventListener('gameOver', handleGameOver);
        return () => window.removeEventListener('gameOver', handleGameOver);
    }, [t]);

    // ── FUNCȚII DE AJUTOR ──
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
        { cd: 20, effect: t.abStrikeEf, icon: '🚀', name: 'Strike' },
        { cd: 30, effect: t.abScrambleEf, icon: '🌀', name: 'Scramble' },
        { cd: 45, effect: t.abShieldEf, icon: '🛡️', name: 'Shield' },
        { cd: 15, effect: t.abSonarEf, icon: '📡', name: 'Sonar' }
    ];

    const useAbility = async (idx) => {
        if (phase !== 'infiltrate') {
            showNotif(t.notifOnlyInfil);
            return;
        }
        if (cds[idx] > 0) return; // E pe cooldown

        // Punem abilitatea pe cooldown
        setCds(prev => {
            const next = [...prev];
            next[idx] = abilitiesInfo[idx].cd;
            return next;
        });

        fireStrikeAnimation(idx);
        showNotif(abilitiesInfo[idx].effect);

        try {
            await fetch('/api/ability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arena_id: arenaID, player_id: playerID, ability_id: idx })
            });
        } catch (e) { console.error("Eroare trimitere abilitate:", e); }
    };

    const fireStrikeAnimation = (idx) => {
        if (!canvasRef.current || !arenaRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const arena = arenaRef.current;

        canvas.width = arena.offsetWidth;
        canvas.height = arena.offsetHeight;

        const abEl = document.getElementById(`ab-${idx}`);
        if (!abEl) return;

        const abRect = abEl.getBoundingClientRect();
        const arRect = arena.getBoundingClientRect();

        const sx = abRect.left - arRect.left + abRect.width / 2;
        const sy = abRect.top - arRect.top + abRect.height / 2;
        const tx = arena.offsetWidth * 0.83;
        const ty = arena.offsetHeight * 0.42;

        const colors = ['#C0A050', '#C0704A', '#4A8C42', '#50A0C0'];
        const col = colors[idx % colors.length];

        let tick = 0;
        const interval = setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            tick++;
            const prog = tick / 30;
            const cx = sx + (tx - sx) * prog;
            const cy = sy + (ty - sy) * prog - Math.sin(prog * Math.PI) * 80;

            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = col;
            ctx.fill();

            if (tick >= 30) {
                clearInterval(interval);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }, 16);
    };

    return (
        <div id="arena" ref={arenaRef} style={{ display: 'block' }}>
            <div id="arena-bg"></div>
            <div className="base-sprite" id="base-sprite-player"></div>
            <div className="base-sprite" id="base-sprite-enemy"></div>

            <canvas id="strike-canvas" ref={canvasRef}></canvas>

            <div id="phase-bar">
                <span className="phase-label">CMD::ARENA</span>
                <span id="phase-name" style={{ color: phase === 'infiltrate' ? '#C0704A' : '#4A8C42' }}>
                    {phase === 'infiltrate' ? t.phaseInfil : t.phaseSetup}
                </span>
                <span id="countdown" style={{ color: phase === 'infiltrate' ? '#C0704A' : '#C0A050' }}>
                    {formatTime(countdown)}
                </span>
            </div>

            <div className="hp-bar-wrap" id="hp-player">
                <span className="hp-label">{t.lblSysYou}</span>
                <div className="hp-track"><div className="hp-fill" style={{ width: `${hpPlayer}%` }}></div></div>
            </div>
            <div className="hp-bar-wrap" id="hp-enemy">
                <span className="hp-label">{t.lblSysEnemy}</span>
                <div className="hp-track"><div className="hp-fill" style={{ width: `${hpEnemy}%` }}></div></div>
            </div>

            <div id="terminal-win" ref={termWinRef}>
                <div className="term-titlebar" id="term-drag-handle">
                    <div className="term-btns">
                        <span className="term-btn"></span>
                        <span className="term-btn"></span>
                        <span className="term-btn" style={{ background: '#4A8C42' }}></span>
                    </div>
                    <span>{t.termTitle}</span>
                </div>
                <div id="term-body" ref={termBodyRef} style={{ flex: 1, padding: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.85)' }}></div>
            </div>

            <div id="pouch">
                <span className="pouch-label">POUCH</span>
                {abilitiesInfo.map((ab, idx) => (
                    <div
                        key={idx}
                        id={`ab-${idx}`}
                        className={`ability ${cds[idx] > 0 ? 'on-cd' : ''}`}
                        onClick={() => useAbility(idx)}
                    >
                        <span className="ab-icon">{ab.icon}</span>
                        <span className="ab-name">{ab.name}</span>
                        <div className="cd-overlay" style={{ opacity: cds[idx] > 0 ? 1 : 0 }}>
                            {cds[idx] > 0 ? cds[idx] : ''}
                        </div>
                    </div>
                ))}
            </div>

            <div id="notif" className={notif.show ? 'show' : ''}>
                {notif.msg}
            </div>

            {/* OVERLAY GAME OVER */}
            {gameOverInfo && (
                <div id="winner-overlay" className="show" style={{ display: 'flex' }}>
                    <div className={`winner-title ${gameOverInfo.won ? 'won' : 'lost'}`}>
                        {gameOverInfo.title}
                    </div>
                    <div className="winner-sub">
                        {gameOverInfo.won ? "Sistemul inamic a fost distrus." : "Sistemul tău a fost compromis."}
                    </div>
                    <button className="btn btn-green" style={{ width: 'auto', padding: '.6rem 2rem' }} onClick={() => window.location.reload()}>
                        {t.btnRestart}
                    </button>
                </div>
            )}
        </div>
    );
}