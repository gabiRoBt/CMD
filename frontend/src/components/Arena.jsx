import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const ABILITY_DEFS = {
    scramble: { icon: '🌀', name: 'SCRAMBLE', color: '#C0704A', effect: 'ENEMY COMMANDS SCRAMBLED  −20 HP' },
    repair:   { icon: '🔧', name: 'REPAIR',   color: '#4A8C42', effect: 'REPAIR KIT ACTIVATED  +15 HP'    },
    rocket:   { icon: '🚀', name: 'ROCKET',   color: '#C0A050', effect: 'ENEMY INPUT LOCKED — 10s  −25 HP' },
    sonar:    { icon: '📡', name: 'SONAR',    color: '#5A9CB0', effect: 'EMPTY FOLDERS DELETED  −15 HP'   },
};

// Culoarea HP-bar-ului în funcție de valoarea HP
const hpColor = (hp) => hp > 60 ? '#4A8C42' : hp > 30 ? '#C0A050' : '#C04A42';

// ── SVG BAZE VECTORIALE ───────────────────────────────────────────────────────

function BaseDevMode() {
    return (
        <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <rect x="5" y="142" width="190" height="38" fill="#1a2818" rx="2"/>
            {[10,36,62,88,113,138,163].map((x,i) => (
                <rect key={i} x={x} y={128+i%2*3} width="24" height="16" fill={i%2?"#3a4a2a":"#2e3e20"} rx="3"/>
            ))}
            <rect x="28" y="58" width="144" height="72" fill="#243320"/>
            {[72,87,102,117].map((y,i) => (
                <line key={i} x1="28" y1={y} x2="172" y2={y} stroke="#1a2818" strokeWidth="1" opacity="0.5"/>
            ))}
            {[68,108,148].map((x,i) => (
                <line key={i} x1={x} y1="58" x2={x} y2="130" stroke="#1a2818" strokeWidth="1.5" opacity="0.4"/>
            ))}
            <rect x="18" y="50" width="164" height="12" fill="#1e2e1a"/>
            <line x1="18" y1="53" x2="182" y2="53" stroke="#5a7a50" strokeWidth="0.8"/>
            {[38,58,78,98,118,138,158,176].map((x,i) => (
                <polygon key={i} points={`${x},53 ${x+3},49 ${x+6},53`} fill="none" stroke="#5a7a50" strokeWidth="0.7"/>
            ))}
            <rect x="2" y="28" width="34" height="104" fill="#1e2e1a"/>
            {[2,13,24].map((x,i) => (
                <rect key={i} x={x} y="20" width="9" height="11" fill="#1e2e1a"/>
            ))}
            <rect x="164" y="28" width="34" height="104" fill="#1e2e1a"/>
            {[164,175,186].map((x,i) => (
                <rect key={i} x={x} y="20" width="9" height="11" fill="#1e2e1a"/>
            ))}
            {[38,68,120,150].map((x,i) => (
                <g key={i}>
                    <rect x={x} y="70" width="22" height="16" fill="#1a2818" rx="1"/>
                    <rect x={x+2} y="72" width="18" height="12" fill="#ffa040" opacity={0.28+i*0.04} rx="1"/>
                </g>
            ))}
            {[[9,44],[171,44],[9,70],[171,70]].map(([x,y],i) => (
                <g key={i}>
                    <rect x={x} y={y} width="15" height="11" fill="#141e12" rx="1"/>
                    <rect x={x+1} y={y+1} width="13" height="9" fill="#ffa040" opacity="0.2" rx="1"/>
                </g>
            ))}
            <rect x="79" y="96" width="42" height="36" fill="#141e12" rx="1"/>
            <rect x="81" y="98" width="18" height="32" fill="#0e180c"/>
            <rect x="101" y="98" width="18" height="32" fill="#0e180c"/>
            <line x1="100" y1="98" x2="100" y2="130" stroke="#243320" strokeWidth="2"/>
            <rect x="94" y="113" width="12" height="3" fill="#4a6a40" rx="1"/>
            <line x1="100" y1="50" x2="100" y2="28" stroke="#4a6a40" strokeWidth="2"/>
            <line x1="90" y1="34" x2="110" y2="34" stroke="#4a6a40" strokeWidth="1.2"/>
            <ellipse cx="100" cy="27" rx="12" ry="5" fill="none" stroke="#4a6a40" strokeWidth="1.5"/>
            <line x1="100" y1="27" x2="100" y2="20" stroke="#4a6a40" strokeWidth="1.5"/>
            <line x1="116" y1="20" x2="116" y2="4" stroke="#5a8a50" strokeWidth="1.5"/>
            <polygon points="116,4 128,8 116,12" fill="#4a8a42"/>
        </svg>
    );
}

function BaseSiberia() {
    return (
        <svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <rect x="5" y="138" width="210" height="22" fill="#0f2035" rx="1"/>
            <path d="M15,138 L15,75 Q15,30 110,30 Q205,30 205,75 L205,138 Z" fill="#1a3a5a"/>
            {Array.from({length:14},(_, i) => {
                const x = 20 + i * 13;
                return <line key={i} x1={x} y1="138" x2={x} y2="45" stroke="#0f2540" strokeWidth="1" opacity="0.6"/>;
            })}
            {[55,70,85,100,115,128].map((y,i) => (
                <line key={i} x1="15" y1={y} x2="205" y2={y} stroke="#0f2540" strokeWidth="0.8" opacity="0.5"/>
            ))}
            <path d="M15,138 L15,75 Q15,30 110,30 Q205,30 205,75 L205,138" fill="none" stroke="#2a5a8a" strokeWidth="2"/>
            <rect x="60" y="95" width="44" height="43" fill="#0f2035" rx="1"/>
            <rect x="106" y="95" width="44" height="43" fill="#0d1e30" rx="1"/>
            <line x1="104" y1="95" x2="104" y2="138" stroke="#2a5a8a" strokeWidth="2"/>
            {[100,105,110,115,120,125,130].map((y,i) => (
                <line key={i} x1="60" y1={y} x2="104" y2={y} stroke="#1a3a5a" strokeWidth="0.8"/>
            ))}
            {[100,105,110,115,120,125,130].map((y,i) => (
                <line key={i} x1="106" y1={y} x2="150" y2={y} stroke="#1a3a5a" strokeWidth="0.8"/>
            ))}
            <rect x="98" y="115" width="8" height="4" fill="#2a5a8a" rx="1"/>
            <rect x="114" y="115" width="8" height="4" fill="#2a5a8a" rx="1"/>
            <rect x="15" y="55" width="30" height="85" fill="#152e4a"/>
            <rect x="10" y="48" width="40" height="12" fill="#0f2035"/>
            <rect x="12" y="50" width="36" height="8" fill="#1a3a5a"/>
            <rect x="20" y="62" width="18" height="12" fill="#0a1628" rx="1"/>
            <rect x="21" y="63" width="16" height="10" fill="#66aadd" opacity="0.2" rx="1"/>
            <rect x="170" y="75" width="22" height="15" fill="#0a1628" rx="1"/>
            <rect x="171" y="76" width="20" height="13" fill="#66aadd" opacity="0.18" rx="1"/>
            <rect x="170" y="100" width="22" height="15" fill="#0a1628" rx="1"/>
            <path d="M15,42 Q50,36 110,34 Q170,36 205,42 Q205,50 205,52 Q170,45 110,43 Q50,45 15,52 Z" fill="#ddeeff" opacity="0.75"/>
            <path d="M15,42 Q50,38 110,36 Q170,38 205,42" fill="none" stroke="#e8f4ff" strokeWidth="2" opacity="0.6"/>
            <line x1="110" y1="34" x2="110" y2="15" stroke="#4a8aaa" strokeWidth="1.5"/>
            <line x1="102" y1="22" x2="118" y2="22" stroke="#4a8aaa" strokeWidth="1"/>
            <circle cx="110" cy="15" r="3" fill="#66aadd" opacity="0.8"/>
            <line x1="125" y1="15" x2="125" y2="2" stroke="#4a8aaa" strokeWidth="1.5"/>
            <polygon points="125,2 138,6 125,10" fill="#00ddff"/>
            <circle cx="35" cy="48" r="2.5" fill="#ff4444" opacity="0.7"/>
            <circle cx="185" cy="48" r="2.5" fill="#ff4444" opacity="0.7"/>
        </svg>
    );
}

function BaseRetro() {
    return (
        <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <rect x="0" y="145" width="200" height="35" fill="#050010"/>
            {[20,40,60,80,100,120,140,160,180].map((x,i) => (
                <line key={i} x1={x} y1="145" x2={x} y2="180" stroke="#ff00ff" strokeWidth="0.4" opacity="0.2"/>
            ))}
            <polygon points="100,8 175,145 25,145" fill="#1a0033"/>
            <polygon points="100,8 175,145 25,145" fill="none" stroke="#ff00ff" strokeWidth="1.5"/>
            {[[80,55,120,55],[65,80,135,80],[50,105,150,105],[35,130,165,130]].map(([x1,y,x2],i) => (
                <g key={i}>
                    <line x1={x1} y1={y} x2={x2} y2={y} stroke="#ff00ff" strokeWidth="0.7" opacity={0.6-i*0.1}/>
                    <line x1={x1} y1={y} x2={x2} y2={y} stroke="#ff00ff" strokeWidth="4" opacity={0.05}/>
                </g>
            ))}
            <rect x="85" y="8" width="30" height="55" fill="#200044"/>
            <rect x="88" y="14" width="24" height="4" fill="#ff00ff" opacity="0.8"/>
            <rect x="88" y="24" width="24" height="4" fill="#ff00ff" opacity="0.6"/>
            <rect x="88" y="34" width="24" height="4" fill="#ffff00" opacity="0.5"/>
            <rect x="88" y="44" width="24" height="4" fill="#ff00ff" opacity="0.4"/>
            <rect x="30" y="88" width="28" height="40" fill="#100020" stroke="#ff00ff" strokeWidth="0.8" opacity="0.9"/>
            {[94,100,106,110,116,120].map((y,i) => (
                <line key={i} x1="32" y1={y} x2={52+Math.sin(i)*8} y2={y} stroke={i%2?"#ff00ff":"#ffff00"} strokeWidth="0.7" opacity="0.5"/>
            ))}
            <rect x="142" y="88" width="28" height="40" fill="#100020" stroke="#ffff00" strokeWidth="0.8" opacity="0.9"/>
            {[94,100,106,110,116,120].map((y,i) => (
                <line key={i} x1="144" y1={y} x2={164+Math.sin(i+2)*8} y2={y} stroke={i%2?"#ffff00":"#ff00ff"} strokeWidth="0.7" opacity="0.5"/>
            ))}
            <rect x="52" y="110" width="16" height="22" fill="#100020" stroke="#ff00ff" strokeWidth="0.8"/>
            <rect x="54" y="112" width="12" height="18" fill="#ff00ff" opacity="0.12"/>
            <rect x="132" y="110" width="16" height="22" fill="#100020" stroke="#ffff00" strokeWidth="0.8"/>
            <rect x="134" y="112" width="12" height="18" fill="#ffff00" opacity="0.1"/>
            <rect x="85" y="118" width="30" height="27" fill="#050010"/>
            <rect x="87" y="120" width="12" height="23" fill="#1a0033"/>
            <rect x="101" y="120" width="12" height="23" fill="#150028"/>
            <line x1="100" y1="120" x2="100" y2="145" stroke="#ff00ff" strokeWidth="0.8" opacity="0.5"/>
            <circle cx="100" cy="8" r="5" fill="#ff00ff" opacity="0.9"/>
            <circle cx="100" cy="8" r="10" fill="#ff00ff" opacity="0.15"/>
            <circle cx="100" cy="8" r="16" fill="#ff00ff" opacity="0.06"/>
            <line x1="25" y1="145" x2="18" y2="118" stroke="#ff00ff" strokeWidth="1"/>
            <circle cx="18" cy="117" r="2.5" fill="#ff00ff" opacity="0.7"/>
            <line x1="175" y1="145" x2="182" y2="118" stroke="#ffff00" strokeWidth="1"/>
            <circle cx="182" cy="117" r="2.5" fill="#ffff00" opacity="0.7"/>
            {[[60,65],[140,72],[85,42],[115,38]].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="1.5" fill={i%2?"#ff00ff":"#ffff00"} opacity={0.5+i*0.1}/>
            ))}
        </svg>
    );
}

function BaseWasteland() {
    return (
        <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <rect x="0" y="148" width="200" height="32" fill="#1e1005"/>
            {[[15,148],[45,151],[90,149],[135,152],[175,148]].map(([x,y],i) => (
                <ellipse key={i} cx={x} cy={y} rx={6+i%3*2} ry="3" fill="#2a1808" opacity="0.8"/>
            ))}
            <polygon points="20,148 15,45 55,40 60,55 85,52 90,38 110,38 115,52 140,55 145,40 185,45 180,148" fill="#3a2010"/>
            {[60,75,90,105,120,135].map((y,i) => (
                <g key={i}>
                    <line x1="20" y1={y} x2="180" y2={y} stroke="#2a1808" strokeWidth="1" opacity="0.4"/>
                    {[30,55,80,105,130,155].map((x,j) => (
                        <line key={j} x1={x+i%2*12} y1={y} x2={x+i%2*12} y2={y+15} stroke="#2a1808" strokeWidth="0.8" opacity="0.3"/>
                    ))}
                </g>
            ))}
            <polygon points="155,55 185,45 188,148 150,148 148,90" fill="#2a1808"/>
            <polygon points="155,55 165,68 158,80 170,90 160,148 150,148 148,90" fill="#240e06" opacity="0.8"/>
            <polygon points="12,148 8,35 52,35 55,148" fill="#3a2010" stroke="#4a2810" strokeWidth="1"/>
            <line x1="12" y1="100" x2="52" y2="100" stroke="#6b3318" strokeWidth="2"/>
            <line x1="12" y1="75" x2="52" y2="75" stroke="#6b3318" strokeWidth="2"/>
            <line x1="15" y1="35" x2="30" y2="75" stroke="#6b3318" strokeWidth="1.5"/>
            <line x1="50" y1="35" x2="35" y2="75" stroke="#6b3318" strokeWidth="1.5"/>
            <rect x="18" y="50" width="16" height="12" fill="#180804" rx="1"/>
            <line x1="18" y1="50" x2="34" y2="62" stroke="#0a0402" strokeWidth="1.5"/>
            <line x1="34" y1="50" x2="18" y2="62" stroke="#0a0402" strokeWidth="1.5"/>
            <rect x="18" y="78" width="16" height="12" fill="#180804" rx="1"/>
            <line x1="20" y1="78" x2="20" y2="90" stroke="#0a0402" strokeWidth="0.8"/>
            <rect x="68" y="65" width="22" height="18" fill="#180804" rx="1"/>
            <rect x="70" y="67" width="18" height="14" fill="#ffa040" opacity="0.15"/>
            <rect x="108" y="65" width="22" height="18" fill="#180804" rx="1"/>
            <line x1="8" y1="38" x2="55" y2="38" stroke="#8a5a28" strokeWidth="1"/>
            {[12,20,28,36,44,50].map((x,i) => (
                <polygon key={i} points={`${x},38 ${x+3},34 ${x+6},38`} fill="none" stroke="#8a5a28" strokeWidth="0.8"/>
            ))}
            <line x1="55" y1="38" x2="185" y2="48" stroke="#8a5a28" strokeWidth="1"/>
            <path d="M82 148 L82 110 Q100 95 118 110 L118 148" fill="#180804"/>
            <path d="M82 110 Q100 95 118 110" fill="none" stroke="#6b3318" strokeWidth="1.5"/>
            <circle cx="100" cy="125" r="6" fill="#ff6600" opacity="0.2"/>
            <circle cx="100" cy="127" r="4" fill="#ff8800" opacity="0.15"/>
            <polygon points="30,50 32,44 34,50 28,46 36,46" fill="#d4a843" opacity="0.8"/>
            <polygon points="8,35 30,22 32,35" fill="#3a2010"/>
            <line x1="30" y1="22" x2="30" y2="12" stroke="#6b3318" strokeWidth="1.5"/>
            <line x1="100" y1="38" x2="100" y2="20" stroke="#8a5a28" strokeWidth="1.5"/>
            <line x1="94" y1="26" x2="106" y2="26" stroke="#8a5a28" strokeWidth="1"/>
            <line x1="92" y1="22" x2="94" y2="26" stroke="#8a5a28" strokeWidth="0.8"/>
            <line x1="108" y1="22" x2="106" y2="26" stroke="#8a5a28" strokeWidth="0.8"/>
        </svg>
    );
}

const SKIN_BASES = {
    'skin-dev-mode':  BaseDevMode,
    'skin-classic':   BaseSiberia,
    'skin-cyberpunk': BaseRetro,
    'skin-wasteland': BaseWasteland,
};

// ─────────────────────────────────────────────────────────────────────────────

export default function Arena({
                                  t, arenaID, playerID, role, phase,
                                  abilities = [], skin = 'skin-dev-mode',
                                  myHP = 100, enemyHP = 100,
                                  onReturnToLobby,
                              }) {
    const [usedAbilities, setUsedAbilities] = useState(new Set());
    const [notif, setNotif]         = useState({ show: false, msg: '' });
    // Stocăm doar outcome-ul (won/draw) — titlul se calculează din `t` la render
    // astfel limbajul selectat este întotdeauna respectat.
    const [gameOverInfo, setGameOverInfo] = useState(null);

    const termBodyRef  = useRef(null);
    const termWinRef   = useRef(null);
    const arenaRef     = useRef(null);
    const canvasRef    = useRef(null);
    const wsRef        = useRef(null);
    const fitAddonRef  = useRef(null);
    const lineCanvasRef = useRef(null);
    const rafRef        = useRef(null);

    const BaseComponent = SKIN_BASES[skin] || BaseDevMode;

    // ── xterm ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!termBodyRef.current) return;
        termBodyRef.current.innerHTML = '';
        const term = new Terminal({
            cursorBlink: true, fontFamily: '"Share Tech Mono", monospace', fontSize: 13,
            theme: { background: 'transparent', foreground: '#00ff41', cursor: '#00ff41' }
        });
        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        term.loadAddon(fitAddon);
        term.open(termBodyRef.current);
        fitAddon.fit();
        term.attachCustomKeyEventHandler((e) => {
            if (e.ctrlKey && e.code === 'KeyC' && e.type === 'keydown') {
                if (term.hasSelection()) { navigator.clipboard.writeText(term.getSelection()); term.clearSelection(); return false; }
                return true;
            }
            if (e.ctrlKey && e.code === 'KeyV' && e.type === 'keydown') return false;
            return true;
        });
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${proto}://${location.host}/ws/terminal?arena_id=${arenaID}&player_id=${playerID}`);
        wsRef.current = ws;
        ws.binaryType = 'arraybuffer';
        ws.onmessage = (e) => term.write(e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : e.data);
        ws.onopen  = () => term.focus();
        ws.onclose = () => term.write('\r\n\x1b[31m[connection closed]\x1b[0m\r\n');
        term.onData((d) => { if (ws.readyState === WebSocket.OPEN) ws.send(d); });
        const r = () => { try { fitAddon.fit(); } catch(_) {} };
        window.addEventListener('resize', r);
        return () => { window.removeEventListener('resize', r); term.dispose(); if (ws.readyState <= WebSocket.OPEN) ws.close(); };
    }, [arenaID, playerID, phase]);

    useEffect(() => {
        if (!termWinRef.current) return;
        const ro = new ResizeObserver(() => { try { fitAddonRef.current?.fit(); } catch(_) {} });
        ro.observe(termWinRef.current);
        return () => ro.disconnect();
    }, []);

    // ── Drag terminal ─────────────────────────────────────────────────────
    useEffect(() => {
        const win = termWinRef.current; const handle = document.getElementById('term-drag-handle');
        if (!win || !handle) return;
        let dragging = false, ox = 0, oy = 0;
        const onDown = (e) => { if (e.target.closest('.resize-hint')) return; dragging = true; const r = win.getBoundingClientRect(); ox = e.clientX-r.left; oy = e.clientY-r.top; e.preventDefault(); };
        const onMove = (e) => { if (!dragging) return; win.style.left = `${Math.max(0,Math.min(window.innerWidth-win.offsetWidth,e.clientX-ox))}px`; win.style.top = `${Math.max(0,Math.min(window.innerHeight-win.offsetHeight-52,e.clientY-oy))}px`; };
        const onUp = () => { dragging = false; };
        handle.addEventListener('mousedown', onDown); document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        return () => { handle.removeEventListener('mousedown', onDown); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    }, []);

    // ── Game Over ─────────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            const p = e.detail;
            // FIX: nu stocăm titlul ca string — se va calcula din `t` la render
            // ca să respecte limba selectată de utilizator în orice moment.
            setGameOverInfo({ won: p.you_won, draw: p.draw || false });
            if (wsRef.current) wsRef.current.close();
        };
        window.addEventListener('gameOver', handler);
        return () => window.removeEventListener('gameOver', handler);
    }, []);  // fără dependență de `t` — nu mai e necesară

    // ── Oprire animație + curățare canvas la game over ────────────────────
    useEffect(() => {
        if (!gameOverInfo) return;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (lineCanvasRef.current) {
            const ctx = lineCanvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, lineCanvasRef.current.width, lineCanvasRef.current.height);
        }
    }, [gameOverInfo]);

    useEffect(() => {
        const canvas = lineCanvasRef.current;
        if (!canvas) return;
        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => {
        const canvas = lineCanvasRef.current;
        if (!canvas) return;

        let offset = 0;

        const draw = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const termWin = termWinRef.current;
            if (!termWin) { rafRef.current = requestAnimationFrame(draw); return; }

            const tRect = termWin.getBoundingClientRect();
            const sx = tRect.left + 7;
            const sy = tRect.bottom + 12;

            const baseEl = document.querySelector(
                phase === 'infiltrate' ? '.right-base-pos' : '.left-base-pos'
            );
            if (!baseEl) { rafRef.current = requestAnimationFrame(draw); return; }

            const bRect = baseEl.getBoundingClientRect();
            const ex    = bRect.left + bRect.width / 2;
            const ey    = bRect.top  + bRect.height * 0.15;

            const isEnemy = phase === 'infiltrate';
            const color   = isEnemy ? '#C0704A' : '#00ff41';
            const label   = isEnemy ? 'ENEMY SYSTEM' : 'YOUR BASE';

            const cpx = (sx + ex) / 2;
            const cpy = Math.max(sy, ey) - 50;

            offset = (offset + 0.5) % 26;
            ctx.save();
            ctx.strokeStyle    = color;
            ctx.lineWidth      = 1.5;
            ctx.setLineDash([8, 5]);
            ctx.lineDashOffset = -offset;
            ctx.globalAlpha    = 0.7;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(cpx, cpy, ex, ey);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.fillStyle   = color;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(ex, ey, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.font        = '9px "Share Tech Mono", monospace';
            ctx.fillStyle   = color;
            ctx.textAlign   = 'center';
            ctx.globalAlpha = 0.65;
            ctx.fillText(label, cpx, cpy + 28);
            ctx.restore();

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(rafRef.current);
            const canvas = lineCanvasRef.current;
            if (canvas) {
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            }
        };
    }, [phase]);

    const showNotif = (msg) => { setNotif({ show:true, msg }); setTimeout(() => setNotif({ show:false, msg:'' }), 3000); };

    const getPlayerBaseCenter = () => {
        if (!arenaRef.current) return { x: 0, y: 0 };
        const w = arenaRef.current.offsetWidth;
        const h = arenaRef.current.offsetHeight;
        return { x: w * 0.18, y: h * 0.67 };
    };

    const useAbility = async (name) => {
        if (phase !== 'infiltrate') { showNotif(t.notifOnlyInfil); return; }
        if (usedAbilities.has(name)) return;
        setUsedAbilities(prev => new Set([...prev, name]));
        fireAbilityAnimation(name);
        showNotif(ABILITY_DEFS[name]?.effect || name.toUpperCase());
        try {
            await fetch('/api/ability', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ arena_id:arenaID, player_id:playerID, ability:name }),
            });
        } catch(e) { console.error(e); }
    };

    const fireAbilityAnimation = (name) => {
        if (!canvasRef.current || !arenaRef.current) return;
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        const arena  = arenaRef.current;
        canvas.width  = arena.offsetWidth;
        canvas.height = arena.offsetHeight;

        if (name === 'repair') {
            animRepair(ctx, canvas);
        } else if (name === 'sonar') {
            animSonar(ctx, canvas);
        } else {
            const { x: sx, y: sy } = getPlayerBaseCenter();
            const tx = arena.offsetWidth  * 0.82;
            const ty = arena.offsetHeight * 0.67;
            animProjectile(ctx, canvas, arena, sx, sy, tx, ty, ABILITY_DEFS[name]?.color || '#C0A050');
        }
    };

    const animProjectile = (ctx, canvas, arena, sx, sy, tx, ty, col) => {
        const trail = []; let tick = 0;
        const iv = setInterval(() => {
            ctx.clearRect(0,0,canvas.width,canvas.height); tick++;
            const prog = tick/52;
            const ease = prog<0.5?2*prog*prog:-1+(4-2*prog)*prog;
            const cx = sx+(tx-sx)*ease; const cy = sy+(ty-sy)*ease-Math.sin(prog*Math.PI)*(arena.offsetHeight*0.38);
            trail.push({x:cx,y:cy}); if(trail.length>22) trail.shift();
            trail.forEach((p,i) => { const a=(i/trail.length)*0.55; const r=1.5+(i/trail.length)*3.5; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fillStyle=col+Math.floor(a*255).toString(16).padStart(2,'0'); ctx.fill(); });
            ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fillStyle=col; ctx.shadowBlur=16; ctx.shadowColor=col; ctx.fill(); ctx.restore();
            if(tick>=52) { clearInterval(iv); let ring=0; const ex=setInterval(()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); ring++; ctx.save(); ctx.beginPath(); ctx.arc(tx,ty,ring*10,0,Math.PI*2); ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.globalAlpha=Math.max(0,1-ring*0.26); ctx.stroke(); ctx.restore(); if(ring>=4){clearInterval(ex);ctx.clearRect(0,0,canvas.width,canvas.height);}},70); }
        }, 16);
    };

    const animRepair = (ctx, canvas) => {
        const { x: cx, y: cy } = getPlayerBaseCenter();
        const col = '#4A8C42';
        let t = 0;
        const iv = setInterval(() => {
            ctx.clearRect(0,0,canvas.width,canvas.height); t++;
            const prog = t/65;
            if(prog>1) { clearInterval(iv); ctx.clearRect(0,0,canvas.width,canvas.height); return; }
            const maxR = canvas.offsetWidth ? canvas.offsetWidth*0.12 : 90;
            for(let ring=0; ring<3; ring++) {
                const r  = maxR*(0.5+ring*0.25)*Math.sin(prog*Math.PI);
                const al = (1-prog)*(1-ring*0.28);
                ctx.beginPath();
                for(let s=0;s<6;s++) { const a=(s/6)*Math.PI*2-Math.PI/6; s===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)); }
                ctx.closePath();
                ctx.strokeStyle=col; ctx.lineWidth=2-ring*0.5; ctx.globalAlpha=al; ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(cx,cy,10*(1-prog),0,Math.PI*2);
            ctx.fillStyle=col; ctx.globalAlpha=(1-prog)*0.5; ctx.fill();
            ctx.globalAlpha=1;
        }, 16);
    };

    const animSonar = (ctx, canvas) => {
        const { x: cx, y: cy } = getPlayerBaseCenter();
        const col = '#5A9CB0';
        const maxR = Math.max(canvas.width, canvas.height) * 0.65;
        let frame = 0;
        const iv = setInterval(() => {
            ctx.clearRect(0,0,canvas.width,canvas.height); frame++;
            for(let w=0;w<4;w++) {
                const delay = w*18;
                if(frame<delay) continue;
                const prog = Math.min((frame-delay)/75, 1);
                const r    = prog*maxR;
                const al   = (1-prog)*0.65;
                ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
                ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.globalAlpha=al; ctx.stroke();
                for(let d=0;d<4;d++) {
                    const ang = (d/4)*Math.PI*2 + prog*Math.PI*0.5;
                    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+r*Math.cos(ang),cy+r*Math.sin(ang));
                    ctx.strokeStyle=col; ctx.lineWidth=0.7; ctx.globalAlpha=al*0.35; ctx.stroke();
                }
            }
            ctx.globalAlpha=1;
            if(frame>75+3*18+15) { clearInterval(iv); ctx.clearRect(0,0,canvas.width,canvas.height); }
        }, 16);
    };

    // Titlul game over calculat la render din `t` curent — fix pentru bug de limbă
    const gameOverTitle = gameOverInfo
        ? (gameOverInfo.draw ? t.drawTitle : (gameOverInfo.won ? t.winTitle : t.loseTitle))
        : '';

    return (
        <div className="arena-wrapper">
            <div id="arena" ref={arenaRef}>
                <div className="top-band"></div>
                <div className="band-separator"></div>
                <div className="bottom-band"></div>
                <div className="ground-deco" id="ground-deco"></div>

                {/* Baza jucător — stânga */}
                <div className="base-container left-base-pos">
                    <BaseComponent />
                </div>
                {/* Baza inamic — dreapta (oglindita) */}
                <div className="base-container right-base-pos">
                    <BaseComponent />
                </div>

                <canvas id="strike-canvas" ref={canvasRef}></canvas>

                <div id="phase-bar">
                    <span className="phase-label">{playerID ?? '—'}</span>
                    <span id="phase-name" style={{ color: phase==='infiltrate'?'#C0704A':'#4A8C42' }}>
                        {phase==='infiltrate'?t.phaseInfil:t.phaseSetup}
                    </span>
                    <span className="phase-nuke">nuke: /bin/nuke_system</span>
                </div>

                {/* HP bars — dinamice, cu culoare și procent */}
                <div className="hp-bar-wrap" id="hp-player">
                    <span className="hp-label">{t.lblSysYou}</span>
                    <div className="hp-track">
                        <div className="hp-fill" style={{ width:`${myHP}%`, background: hpColor(myHP) }}></div>
                    </div>
                    <span className="hp-pct" style={{ color: hpColor(myHP) }}>{myHP}%</span>
                </div>
                <div className="hp-bar-wrap" id="hp-enemy">
                    <span className="hp-label">{t.lblSysEnemy}</span>
                    <div className="hp-track">
                        <div className="hp-fill hp-fill-enemy" style={{ width:`${enemyHP}%`, background: hpColor(enemyHP) }}></div>
                    </div>
                    <span className="hp-pct" style={{ color: hpColor(enemyHP) }}>{enemyHP}%</span>
                </div>

                <div id="notif" className={notif.show?'show':''}>{notif.msg}</div>

                {gameOverInfo && (
                    <div id="winner-overlay" className="show" style={{display:'flex'}}>
                        <div className={`winner-title ${gameOverInfo.draw?'draw':gameOverInfo.won?'won':'lost'}`}>
                            {gameOverTitle}
                        </div>
                        <div className="winner-sub">
                            {gameOverInfo.draw
                                ? 'Time expired. Neither system was compromised.'
                                : gameOverInfo.won
                                    ? 'Enemy system destroyed.'
                                    : 'Your system was compromised.'
                            }
                        </div>
                        <button className="btn btn-green" style={{width:'auto',padding:'.6rem 2rem'}}
                                onClick={() => { setGameOverInfo(null); if(onReturnToLobby) onReturnToLobby(); else window.location.reload(); }}>
                            {t.btnRestart}
                        </button>
                    </div>
                )}
            </div>

            {/* Linia animată terminal → bază — ascunsă la game over */}
            <canvas
                ref={lineCanvasRef}
                style={{
                    position:      'fixed',
                    inset:         0,
                    pointerEvents: 'none',
                    zIndex:        199,
                    display:       gameOverInfo ? 'none' : 'block',
                }}
            />

            {/* Terminal — ascuns la game over */}
            <div id="terminal-win" ref={termWinRef} style={{ display: gameOverInfo ? 'none' : 'flex' }}>
                <div className="term-bubble-tail"></div>
                <div className="term-titlebar" id="term-drag-handle">
                    <div className="term-btns">
                        <span className="term-btn"></span><span className="term-btn"></span>
                        <span className="term-btn" style={{background:'#4A8C42'}}></span>
                    </div>
                    <span>{t.termTitle}</span>
                    <span className="resize-hint" title="Drag corner to resize">⤢</span>
                </div>
                <div id="term-body" ref={termBodyRef} style={{flex:1,padding:'4px',overflow:'hidden',background:'rgba(0,0,0,0.85)'}}></div>
            </div>

            <footer id="arena-footer">
                <div className="footer-left">
                    <span className="footer-tag">ARENA</span>
                    <span className="footer-id">{arenaID??'—'}</span>
                </div>
                <div id="pouch">
                    {abilities.length===0?(
                        <span className="pouch-empty-msg">{phase==='setup'?'[ mv weapon_*.bin ~/pouch/ ]':'— POUCH EMPTY —'}</span>
                    ):(
                        abilities.map((name)=>{
                            const def=ABILITY_DEFS[name]||{icon:'?',name:name.toUpperCase(),color:'#666',effect:''};
                            const used=usedAbilities.has(name);
                            return (
                                <div key={name} className={`ability-pill${used?' used':''}`} onClick={()=>useAbility(name)}
                                     style={{'--ab-color':used?'#2a2a2a':def.color}} title={used?'Already used':def.effect}>
                                    <div className="ab-cd-progress" style={{width:0}}/>
                                    <span className="ab-icon">{used?'—':def.icon}</span>
                                    <span className="ab-name">{def.name}</span>
                                    {used?<span className="ab-used-tag">USED</span>:<span className="ab-key">[use]</span>}
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="footer-right">
                    <span className="footer-tag">ROLE</span>
                    <span className="footer-role" style={{color:role==='host'?'#4A8C42':'#C0704A'}}>{role?.toUpperCase()??'—'}</span>
                </div>
            </footer>
        </div>
    );
}