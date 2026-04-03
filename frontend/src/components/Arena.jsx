import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const ABILITY_DEFS = {
    scramble: { icon: '🌀', name: 'SCRAMBLE', color: '#C0704A' },
    repair:   { icon: '🔧', name: 'REPAIR',   color: '#4A8C42' },
    rocket:   { icon: '🚀', name: 'ROCKET',   color: '#C0A050' },
    sonar:    { icon: '📡', name: 'SONAR',    color: '#5A9CB0' },
};

const ABILITY_EFFECTS = {
    scramble: { ro: 'COMENZI INAMIC AMESTECATE  −20 HP', en: 'ENEMY COMMANDS SCRAMBLED  −20 HP' },
    repair:   { ro: 'REPARAȚIE ACTIVATĂ  +15 HP',         en: 'REPAIR KIT ACTIVATED  +15 HP'    },
    rocket:   { ro: 'INPUT INAMIC BLOCAT — 10s  −25 HP',  en: 'ENEMY INPUT LOCKED — 10s  −25 HP'},
    sonar:    { ro: 'DIRECTOARE GOALE ȘTERSE  −15 HP',    en: 'EMPTY FOLDERS DELETED  −15 HP'   },
};

// Antenna position as fraction of the base-container div dimensions.
// Used to compute the screen-space endpoint for the connection line.
// All antennas are at horizontal center (x=0.5).
// y values are approximate fractions of the rendered div height.
const ANTENNA_FRAC = {
    'skin-dev-mode':  { x: 0.48, y: 0.30 }, // tent peak
    'skin-classic':   { x: 0.50, y: 0.12 }, // Siberia SVG: circle cy=10 in 160-tall viewBox
    'skin-cyberpunk': { x: 0.495, y: 0.04 }, // Retro SVG: apex cy=8 in 180-tall viewBox
    'skin-wasteland': { x: 0.50, y: 0.1 }, // Wasteland SVG: antenna tip y=20 in 180-tall viewBox
};

// ── SVG BASES ─────────────────────────────────────────────────────────────────

function BaseDevMode() {
    return (
        <div style={{
            width: '100%', height: '100%',
            border: '2px solid rgba(0,0,0,0.85)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
            background: 'rgba(10,8,5,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
        }}>
            <img
                src="assets/baza.jpeg" alt="Base"
                style={{ width: '95%', height: '95%', objectFit: 'contain', display: 'block' }}
                onError={e => { e.target.style.display = 'none'; }}
            />
        </div>
    );
}

function DevModeDecorations() {
    const frame = {
        position: 'absolute', zIndex: 8, pointerEvents: 'none',
        border: '2px solid rgba(0,0,0,0.8)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        background: 'rgba(5,4,3,0.08)', overflow: 'hidden',
    };
    const img = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' };
    return (
        <>
            <div style={{ ...frame, bottom: '7%', left: '33%', width: '7%', aspectRatio: '0.5/1' }}>
                <img src="assets/cactus.jpeg" alt="" style={img} onError={e => e.target.style.display = 'none'} />
            </div>
            <div style={{ ...frame, bottom: '10%', left: '43%', width: '6%', aspectRatio: '1/0.75' }}>
                <img src="assets/sarpe.jpeg" alt="" style={img} onError={e => e.target.style.display = 'none'} />
            </div>
            <div style={{ ...frame, bottom: '5%', left: '51%', width: '10%', aspectRatio: '2.2/1' }}>
                <img src="assets/rafala.jpeg" alt="" style={img} onError={e => e.target.style.display = 'none'} />
            </div>
        </>
    );
}

// Siberia — no flag, antenna at (110,10) in 220×160 viewBox
function BaseSiberia() {
    return (
        <svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
                <linearGradient id="siArch" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2e5880"/>
                    <stop offset="50%" stopColor="#1a3a5a"/>
                    <stop offset="100%" stopColor="#0f2035"/>
                </linearGradient>
                <linearGradient id="siSteel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2a4a6a"/>
                    <stop offset="40%" stopColor="#1e3a56"/>
                    <stop offset="100%" stopColor="#0f2035"/>
                </linearGradient>
                <linearGradient id="siSnow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eef6ff" stopOpacity="0.95"/>
                    <stop offset="100%" stopColor="#cce0f5" stopOpacity="0.6"/>
                </linearGradient>
                <radialGradient id="siWindow" cx="50%" cy="40%">
                    <stop offset="0%" stopColor="#88ccee" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#224466" stopOpacity="0.1"/>
                </radialGradient>
                <filter id="siShadow">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5"/>
                </filter>
            </defs>
            {/* Foundation */}
            <rect x="5" y="138" width="210" height="22" fill="#0b1a2b" rx="1"/>
            <rect x="5" y="136" width="210" height="4" fill="#0e2236"/>
            {/* Arch body */}
            <path d="M15,138 L15,72 Q15,28 110,28 Q205,28 205,72 L205,138 Z" fill="url(#siArch)" filter="url(#siShadow)"/>
            {/* Metal rib lines */}
            {Array.from({ length: 15 }, (_, i) => {
                const x = 18 + i * 13;
                return <line key={i} x1={x} y1={Math.max(28, 72 - Math.abs(i - 7) * 8)} x2={x} y2="138" stroke="#0a1f35" strokeWidth="1.2" opacity="0.7"/>;
            })}
            {/* Horizontal purlins */}
            {[55, 72, 90, 108, 122, 135].map((y, i) => (
                <line key={i} x1="15" y1={y} x2="205" y2={y} stroke="#1a3555" strokeWidth="0.9" opacity="0.6"/>
            ))}
            {/* Arch highlight */}
            <path d="M18,138 L18,74 Q18,34 110,34 Q202,34 202,74 L202,138" fill="none" stroke="#3a6a9a" strokeWidth="1.5" opacity="0.5"/>
            {/* Snow cap */}
            <path d="M15,40 Q50,30 110,28 Q170,30 205,40 L205,50 Q170,38 110,36 Q50,38 15,50 Z" fill="url(#siSnow)" opacity="0.9"/>
            <path d="M15,40 Q50,32 110,30 Q170,32 205,40" fill="none" stroke="#e0f0ff" strokeWidth="1.5" opacity="0.7"/>
            {/* Snow icicles */}
            {[30, 48, 65, 82, 100, 120, 138, 155, 175, 192].map((x, i) => {
                const h = 4 + (i % 3) * 5;
                return <polygon key={i} points={`${x},40 ${x + 3},${40 + h} ${x + 6},40`} fill="#ddeeff" opacity={0.7 - i % 2 * 0.2}/>;
            })}
            {/* Blast doors */}
            <rect x="58" y="94" width="46" height="44" fill="#0e2035" rx="1"/>
            <rect x="106" y="94" width="46" height="44" fill="#0c1c2d" rx="1"/>
            <line x1="104" y1="94" x2="104" y2="138" stroke="#2a5a8a" strokeWidth="2.5"/>
            {[100, 108, 116, 124, 130].map((y, i) => (
                <g key={i}>
                    <line x1="58" y1={y} x2="104" y2={y} stroke="#14293f" strokeWidth="0.8"/>
                    <line x1="106" y1={y} x2="152" y2={y} stroke="#12253b" strokeWidth="0.8"/>
                </g>
            ))}
            <rect x="96" y="114" width="8" height="5" fill="#2a5a8a" rx="1"/>
            <rect x="110" y="114" width="8" height="5" fill="#2a5a8a" rx="1"/>
            {/* Warning stripes */}
            {[0, 1, 2].map(i => (
                <g key={i} opacity="0.3">
                    <rect x={62 + i * 12} y="136" width="6" height="2" fill="#ffb300"/>
                    <rect x={112 + i * 12} y="136" width="6" height="2" fill="#ffb300"/>
                </g>
            ))}
            {/* Control tower left */}
            <rect x="15" y="52" width="32" height="88" fill="url(#siSteel)"/>
            <rect x="10" y="44" width="42" height="12" fill="#0f2035"/>
            <rect x="12" y="46" width="38" height="9" fill="#1a3a5a"/>
            <rect x="20" y="60" width="20" height="14" fill="#0a1828" rx="1"/>
            <rect x="21" y="61" width="18" height="12" fill="url(#siWindow)" rx="1"/>
            <line x1="30" y1="61" x2="30" y2="73" stroke="#1a3a5a" strokeWidth="1"/>
            <line x1="21" y1="67" x2="39" y2="67" stroke="#1a3a5a" strokeWidth="1"/>
            {/* Tower rivets */}
            {[[17, 55], [17, 80], [17, 105], [43, 55], [43, 80], [43, 105]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="1.5" fill="#0a1f35" stroke="#2a5080" strokeWidth="0.5"/>
            ))}
            {/* Side windows right */}
            <rect x="170" y="70" width="24" height="18" fill="#0a1828" rx="1"/>
            <rect x="171" y="71" width="22" height="16" fill="url(#siWindow)" rx="1"/>
            <line x1="182" y1="71" x2="182" y2="87" stroke="#1a3a5a" strokeWidth="1"/>
            <rect x="170" y="100" width="24" height="16" fill="#0a1828" rx="1"/>
            <rect x="171" y="101" width="22" height="14" fill="url(#siWindow)" rx="1"/>
            {/* Antenna — NO FLAG */}
            <line x1="110" y1="28" x2="110" y2="10" stroke="#3a6a9a" strokeWidth="2"/>
            <line x1="103" y1="17" x2="117" y2="17" stroke="#3a6a9a" strokeWidth="1.2"/>
            <circle cx="110" cy="10" r="3" fill="#66aaee" opacity="0.85"/>
            <circle cx="110" cy="10" r="6" fill="#66aaee" opacity="0.15"/>
            {/* Nav lights */}
            <circle cx="35" cy="44" r="2.5" fill="#ff4444" opacity="0.75"/>
            <circle cx="185" cy="44" r="2.5" fill="#ff4444" opacity="0.75"/>
        </svg>
    );
}

function SiberiaDecorations() {
    // 4 trees at varied, non-symmetric positions
    const trees = [
        { side: 'left',  pos: '24%', size: '9%',  zIdx: 6 },
        { side: 'left',  pos: '33%', size: '6.5%',zIdx: 5 },
        { side: 'right', pos: '26%', size: '7.5%',zIdx: 6 },
        { side: 'right', pos: '36%', size: '5.5%',zIdx: 5 },
    ];
    return (
        <>
            {trees.map((t, i) => (
                <svg key={i}
                     style={{
                         position: 'absolute', bottom: '36%',
                         [t.side]: t.pos,
                         width: t.size, zIndex: t.zIdx, pointerEvents: 'none',
                     }}
                     viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="40,5 10,60 70,60" fill="#0d2e1a" opacity="0.9"/>
                    <polygon points="40,25 8,72 72,72" fill="#0e3420" opacity="0.9"/>
                    <polygon points="40,45 6,88 74,88" fill="#0f3a24" opacity="0.9"/>
                    <rect x="34" y="88" width="12" height="28" fill="#0a1e10"/>
                    <polygon points="40,5 16,52 64,52" fill="#e0f0ff" opacity="0.55"/>
                    <polygon points="40,25 14,65 66,65" fill="#e0f0ff" opacity="0.4"/>
                    <polygon points="40,45 12,80 68,80" fill="#e0f0ff" opacity="0.28"/>
                </svg>
            ))}
            <div style={{
                position: 'absolute', bottom: '38%', left: '30%', right: '30%',
                height: '6%', zIndex: 5, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(180,220,255,0.25), rgba(140,200,240,0.15))',
                border: '1px solid rgba(160,210,255,0.3)', borderRadius: '2px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
            }}>
                <svg width="100%" height="100%" viewBox="0 0 200 30" preserveAspectRatio="none">
                    <line x1="40" y1="5" x2="55" y2="20" stroke="rgba(180,220,255,0.4)" strokeWidth="0.8"/>
                    <line x1="55" y1="20" x2="70" y2="12" stroke="rgba(180,220,255,0.4)" strokeWidth="0.8"/>
                    <line x1="100" y1="2" x2="115" y2="18" stroke="rgba(180,220,255,0.35)" strokeWidth="0.7"/>
                    <line x1="150" y1="8" x2="165" y2="25" stroke="rgba(180,220,255,0.3)" strokeWidth="0.6"/>
                </svg>
            </div>
        </>
    );
}

// Retro — apex at (100,8) in 200×180 viewBox, no flag
function BaseRetro() {
    return (
        <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
                <linearGradient id="retPyramid" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#280055"/>
                    <stop offset="50%" stopColor="#1a0033"/>
                    <stop offset="100%" stopColor="#0d0022"/>
                </linearGradient>
                <linearGradient id="retScreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#220040"/>
                    <stop offset="100%" stopColor="#100020"/>
                </linearGradient>
                <filter id="retGlow">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="retGlowStrong">
                    <feGaussianBlur stdDeviation="3.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <rect x="0" y="145" width="200" height="35" fill="#050010"/>
            {[20, 40, 60, 80, 100, 120, 140, 160, 180].map((x, i) => (
                <line key={i} x1={x} y1="145" x2={x} y2="180" stroke="#ff00ff" strokeWidth="0.35" opacity="0.25"/>
            ))}
            {[150, 158, 166, 174].map((y, i) => (
                <line key={i} x1="0" y1={y} x2="200" y2={y} stroke="#ff00ff" strokeWidth="0.35" opacity="0.2"/>
            ))}
            {/* Pyramid */}
            <polygon points="100,8 178,145 22,145" fill="url(#retPyramid)"/>
            <polygon points="100,8 178,145 22,145" fill="none" stroke="#ff00ff" strokeWidth="1.8" filter="url(#retGlow)" opacity="0.9"/>
            <polygon points="100,8 178,145 22,145" fill="none" stroke="#dd00dd" strokeWidth="0.7"/>
            {/* Level lines */}
            {[[82, 55, 118, 55], [68, 80, 132, 80], [54, 105, 146, 105], [40, 130, 160, 130]].map(([x1, y, x2], i) => (
                <g key={i}>
                    <line x1={x1} y1={y} x2={x2} y2={y} stroke="#ff00ff" strokeWidth="3" opacity={0.08 - i * 0.01}/>
                    <line x1={x1} y1={y} x2={x2} y2={y} stroke="#ff00ff" strokeWidth="0.8" opacity={0.55 - i * 0.08}/>
                </g>
            ))}
            {/* Central tower */}
            <rect x="84" y="8" width="32" height="56" fill="#200044"/>
            {[[88, 14, '#ff00ff', 0.7], [88, 24, '#ff00ff', 0.55], [88, 34, '#ffff00', 0.5], [88, 44, '#ff00ff', 0.4]].map(([x, y, col, op], i) => (
                <rect key={i} x={x} y={y} width="24" height="4" fill={col} opacity={op} rx="0.5"/>
            ))}
            {/* Hologram displays */}
            <rect x="26" y="86" width="30" height="44" fill="url(#retScreen)" stroke="#ff00ff" strokeWidth="0.8" opacity="0.95"/>
            {[92, 99, 106, 113, 120, 126].map((y, i) => (
                <line key={i} x1="28" y1={y} x2={46 + Math.sin(i * 1.2) * 10} y2={y} stroke={i % 2 ? '#ff00ff' : '#ffff00'} strokeWidth="0.7" opacity="0.5"/>
            ))}
            <rect x="144" y="86" width="30" height="44" fill="url(#retScreen)" stroke="#ffff00" strokeWidth="0.8" opacity="0.95"/>
            {[92, 99, 106, 113, 120, 126].map((y, i) => (
                <line key={i} x1="146" y1={y} x2={164 + Math.sin(i * 1.5) * 8} y2={y} stroke={i % 2 ? '#ffff00' : '#ff00ff'} strokeWidth="0.7" opacity="0.5"/>
            ))}
            {/* Side windows */}
            <rect x="50" y="108" width="18" height="24" fill="#100020" stroke="#ff00ff" strokeWidth="0.8"/>
            <rect x="52" y="110" width="14" height="20" fill="#ff00ff" opacity="0.1"/>
            <rect x="132" y="108" width="18" height="24" fill="#100020" stroke="#ffff00" strokeWidth="0.8"/>
            <rect x="134" y="110" width="14" height="20" fill="#ffff00" opacity="0.09"/>
            {/* Entry door */}
            <rect x="84" y="116" width="32" height="29" fill="#050010"/>
            <rect x="86" y="118" width="13" height="25" fill="#180030"/>
            <rect x="101" y="118" width="13" height="25" fill="#130028"/>
            <line x1="100" y1="118" x2="100" y2="145" stroke="#ff00ff" strokeWidth="0.8" opacity="0.5"/>
            {/* Apex — the "antenna" for line attachment */}
            <circle cx="100" cy="8" r="5" fill="#ff00ff" opacity="0.95" filter="url(#retGlowStrong)"/>
            <circle cx="100" cy="8" r="12" fill="#ff00ff" opacity="0.12"/>
            {/* Side antennas */}
            <line x1="22" y1="145" x2="15" y2="116" stroke="#ff00ff" strokeWidth="1.2" opacity="0.7"/>
            <circle cx="15" cy="115" r="2.5" fill="#ff00ff" opacity="0.8" filter="url(#retGlow)"/>
            <line x1="178" y1="145" x2="185" y2="116" stroke="#ffff00" strokeWidth="1.2" opacity="0.7"/>
            <circle cx="185" cy="115" r="2.5" fill="#ffff00" opacity="0.8" filter="url(#retGlow)"/>
            {/* Data particles */}
            {[[55, 68, 1.5, '#ff00ff'], [145, 75, 1.2, '#ffff00'], [80, 40, 1.8, '#ff00ff'], [120, 35, 1.4, '#ffff00']].map(([x, y, r, c], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill={c} opacity={0.5 + i * 0.1} filter="url(#retGlow)"/>
            ))}
        </svg>
    );
}

function RetroDecorations() {
    return (
        <>
            <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
                <div className="cyber-scanline"/>
            </div>
            <div style={{
                position: 'absolute', top: '5%', bottom: '40%', left: '2%', width: '2.5%',
                zIndex: 6, pointerEvents: 'none', overflow: 'hidden',
                border: '1px solid rgba(255,0,255,0.2)', background: 'rgba(20,0,40,0.4)',
            }}>
                <div className="matrix-col" style={{ '--delay': '0s' }}/>
            </div>
            <div style={{
                position: 'absolute', top: '5%', bottom: '40%', right: '2%', width: '2.5%',
                zIndex: 6, pointerEvents: 'none', overflow: 'hidden',
                border: '1px solid rgba(255,255,0,0.2)', background: 'rgba(20,0,40,0.4)',
            }}>
                <div className="matrix-col matrix-col-alt" style={{ '--delay': '-2s' }}/>
            </div>
            <div style={{
                position: 'absolute', top: '6%', left: '50%', transform: 'translateX(-50%)',
                zIndex: 6, pointerEvents: 'none',
                border: '1px solid rgba(255,0,255,0.35)', background: 'rgba(15,0,30,0.7)',
                padding: '4px 14px', fontFamily: 'monospace', fontSize: '9px',
                color: 'rgba(255,0,255,0.7)', letterSpacing: '.15em', backdropFilter: 'blur(4px)',
            }}>
                THREAT LEVEL: CRITICAL · SYS: ONLINE
            </div>
        </>
    );
}

// Wasteland — antenna tip at (100,20) in 200×180 viewBox, no flag
function BaseWasteland() {
    return (
        <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
                <linearGradient id="wlTower" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3e2412"/>
                    <stop offset="100%" stopColor="#1e1006"/>
                </linearGradient>
                <linearGradient id="wlFire" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#ff6600"/>
                    <stop offset="60%" stopColor="#ff3300" stopOpacity="0.7"/>
                    <stop offset="100%" stopColor="#ffaa00" stopOpacity="0"/>
                </linearGradient>
                <filter id="wlShadow">
                    <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="#1a0800" floodOpacity="0.7"/>
                </filter>
                <pattern id="brickPat" x="0" y="0" width="20" height="12" patternUnits="userSpaceOnUse">
                    <rect width="20" height="12" fill="#3a2010"/>
                    <rect x="1" y="1" width="8" height="5" fill="#422312" rx="0.3"/>
                    <rect x="11" y="1" width="8" height="5" fill="#3e1f0e" rx="0.3"/>
                    <rect x="5" y="7" width="9" height="4" fill="#402010" rx="0.3"/>
                    <rect x="1" y="7" width="3" height="4" fill="#3c1e0c" rx="0.3"/>
                    <rect x="16" y="7" width="3" height="4" fill="#3c1e0c" rx="0.3"/>
                </pattern>
            </defs>
            {/* Ground */}
            <rect x="0" y="148" width="200" height="32" fill="#1e1005"/>
            {[15, 40, 80, 120, 165, 185].map((x, i) => (
                <ellipse key={i} cx={x} cy={148} rx={7 + i % 3 * 3} ry="4" fill="#2a1608" opacity="0.9"/>
            ))}
            {/* Main fortress wall */}
            <polygon points="20,148 16,42 55,38 60,54 84,51 90,36 110,36 115,51 139,54 145,38 184,42 180,148"
                     fill="url(#brickPat)" filter="url(#wlShadow)"/>
            <polygon points="20,148 16,42 55,38 60,54 84,51 90,36 110,36 115,51 139,54 145,38 184,42 180,148"
                     fill="none" stroke="#5a3018" strokeWidth="1.5" opacity="0.6"/>
            {/* Cracks */}
            <path d="M80 70 L85 90 L78 110" fill="none" stroke="#1a0a04" strokeWidth="2.5" opacity="0.7"/>
            <path d="M120 60 L115 85" fill="none" stroke="#1a0a04" strokeWidth="2" opacity="0.5"/>
            {/* Collapsed right section */}
            <polygon points="145,38 180,148 155,148 150,90" fill="#251208" opacity="0.9"/>
            {/* Left tower */}
            <rect x="8" y="32" width="38" height="118" fill="url(#wlTower)" stroke="#5a3018" strokeWidth="1.5" filter="url(#wlShadow)"/>
            {[50, 64, 78, 92, 106, 120, 134].map((y, i) => (
                <line key={i} x1="8" y1={y} x2="46" y2={y} stroke="#1a0804" strokeWidth="1" opacity="0.4"/>
            ))}
            {/* Tower battlements */}
            {[8, 18, 28, 36].map((x, i) => (
                <rect key={i} x={x} y="20" width="8" height="14" fill="#3a1e0a"/>
            ))}
            {/* Scaffold */}
            <line x1="8" y1="96" x2="46" y2="96" stroke="#6b3318" strokeWidth="2"/>
            <line x1="8" y1="72" x2="46" y2="72" stroke="#6b3318" strokeWidth="2"/>
            <line x1="14" y1="32" x2="28" y2="72" stroke="#6b3318" strokeWidth="1.5" opacity="0.7"/>
            <line x1="40" y1="32" x2="28" y2="72" stroke="#6b3318" strokeWidth="1.5" opacity="0.7"/>
            {/* Broken tower window */}
            <rect x="16" y="48" width="18" height="14" fill="#180804" rx="1"/>
            <line x1="16" y1="48" x2="34" y2="62" stroke="#0a0402" strokeWidth="2"/>
            <line x1="34" y1="48" x2="16" y2="62" stroke="#0a0402" strokeWidth="1.5"/>
            <rect x="16" y="76" width="18" height="13" fill="#180804" rx="1"/>
            {/* Main windows */}
            <rect x="62" y="62" width="24" height="20" fill="#180804" rx="1"/>
            <rect x="64" y="64" width="20" height="16" fill="#ff8020" opacity="0.18" rx="1"/>
            <rect x="108" y="62" width="22" height="20" fill="#180804" rx="1"/>
            {/* Barbed wire */}
            <line x1="8" y1="36" x2="56" y2="36" stroke="#8a5a28" strokeWidth="1.2"/>
            {[12, 20, 28, 36, 44, 52].map((x, i) => (
                <polygon key={i} points={`${x},36 ${x + 3},32 ${x + 6},36`} fill="none" stroke="#8a5a28" strokeWidth="0.9"/>
            ))}
            <line x1="56" y1="36" x2="184" y2="46" stroke="#8a5a28" strokeWidth="1.2" opacity="0.7"/>
            {/* Arch door */}
            <path d="M80 148 L80 108 Q100 92 120 108 L120 148" fill="#180804"/>
            <path d="M80 108 Q100 92 120 108" fill="none" stroke="#6b3318" strokeWidth="2"/>
            {/* Interior fire */}
            <ellipse cx="100" cy="132" rx="12" ry="8" fill="#ff6600" opacity="0.2"/>
            <ellipse cx="100" cy="128" rx="8" ry="5" fill="#ff8800" opacity="0.15"/>
            {/* Tower top fire — NO FLAG */}
            <ellipse cx="27" cy="22" rx="8" ry="4" fill="url(#wlFire)" opacity="0.8"/>
            <ellipse cx="27" cy="20" rx="5" ry="3" fill="url(#wlFire)" opacity="0.6"/>
            {/* Star emblem */}
            <polygon points="27,48 29,42 31,48 25,44 33,44" fill="#d4a843" opacity="0.85"/>
            {/* Ruined right tower top */}
            <polygon points="144,38 160,24 162,38" fill="#3a2010"/>
            {/* Antenna — line attachment point at top (100,20) */}
            <line x1="100" y1="38" x2="100" y2="20" stroke="#8a5a28" strokeWidth="1.5"/>
            <line x1="94" y1="26" x2="106" y2="26" stroke="#8a5a28" strokeWidth="1"/>
            <line x1="92" y1="22" x2="94" y2="26" stroke="#8a5a28" strokeWidth="0.8"/>
            <line x1="108" y1="22" x2="106" y2="26" stroke="#8a5a28" strokeWidth="0.8"/>
            {/* Rubble */}
            {[[60, 142], [90, 145], [130, 144], [150, 143]].map(([x, y], i) => (
                <polygon key={i} points={`${x},${y} ${x + 6},${y - 4} ${x + 12},${y}`} fill="#2a1508" opacity="0.8"/>
            ))}
        </svg>
    );
}

function WastelandDecorations() {
    // 4 dead trees at varied positions
    const deadTrees = [
        { side: 'left',  pct: '25%', w: '5.5%', scaleX: 1   },
        { side: 'left',  pct: '34%', w: '3.8%', scaleX: -1  },
        { side: 'right', pct: '26%', w: '4.5%', scaleX: 1   },
        { side: 'right', pct: '37%', w: '3.2%', scaleX: -1  },
    ];
    return (
        <>
            {deadTrees.map((tr, i) => (
                <svg key={i}
                     style={{
                         position: 'absolute', bottom: '37%',
                         [tr.side]: tr.pct,
                         width: tr.w, zIndex: 6, pointerEvents: 'none',
                         transform: `scaleX(${tr.scaleX})`,
                     }}
                     viewBox="0 0 50 100" xmlns="http://www.w3.org/2000/svg">
                    <line x1="25" y1="100" x2="25" y2="20" stroke="#3a1a08" strokeWidth="4"/>
                    <line x1="25" y1="35" x2="8" y2="18" stroke="#3a1a08" strokeWidth="2.5"/>
                    <line x1="25" y1="45" x2="42" y2="28" stroke="#3a1a08" strokeWidth="2.5"/>
                    <line x1="25" y1="55" x2="5" y2="48" stroke="#3a1a08" strokeWidth="2"/>
                    <line x1="25" y1="62" x2="45" y2="52" stroke="#3a1a08" strokeWidth="2"/>
                    <line x1="8"  y1="18" x2="3"  y2="10" stroke="#3a1a08" strokeWidth="1.5"/>
                    <line x1="8"  y1="18" x2="14" y2="8"  stroke="#3a1a08" strokeWidth="1.5"/>
                </svg>
            ))}
            {/* Fire barrel */}
            <svg style={{ position: 'absolute', bottom: '38%', left: '47%', width: '4%', zIndex: 7, pointerEvents: 'none' }}
                 viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="28" width="24" height="30" fill="#2a1008" rx="2"/>
                <rect x="6" y="30" width="28" height="4" fill="#3a1808" rx="1"/>
                <rect x="6" y="40" width="28" height="4" fill="#3a1808" rx="1"/>
                <rect x="6" y="50" width="28" height="4" fill="#3a1808" rx="1"/>
                <path d="M20,28 Q14,18 18,10 Q22,18 20,12 Q28,18 24,10 Q26,20 20,28" fill="#ff6600" opacity="0.9" className="wl-fire"/>
                <path d="M20,28 Q16,22 19,16 Q22,22 20,18 Q25,22 22,16 Q24,23 20,28" fill="#ffaa00" opacity="0.8" className="wl-fire"/>
            </svg>
            <div style={{
                position: 'absolute', bottom: '35%', left: 0, right: 0, height: '8%',
                zIndex: 5, pointerEvents: 'none',
                background: 'linear-gradient(to top, rgba(90,50,20,0.25), transparent)',
            }}/>
        </>
    );
}

const SKIN_BASES = {
    'skin-dev-mode':  BaseDevMode,
    'skin-classic':   BaseSiberia,
    'skin-cyberpunk': BaseRetro,
    'skin-wasteland': BaseWasteland,
};

// ── Main Arena component ──────────────────────────────────────────────────────

export default function Arena({
                                  t, lang = 'en', arenaID, playerID, role, phase,
                                  abilities = [], skin = 'skin-classic',
                                  myHP = 100, enemyHP = 100,
                                  incomingAbility = null,
                                  onReturnToLobby,
                              }) {
    const [usedAbilities, setUsedAbilities] = useState(new Set());
    const [notif, setNotif]               = useState({ show: false, msg: '' });
    const [gameOverInfo, setGameOverInfo]  = useState(null);

    const termBodyRef   = useRef(null);
    const termWinRef    = useRef(null);
    const arenaRef      = useRef(null);
    const canvasRef     = useRef(null);
    const wsRef         = useRef(null);
    const fitAddonRef   = useRef(null);
    const lineCanvasRef = useRef(null);
    const rafRef        = useRef(null);
    // Keep i18n labels stable in the canvas RAF loop
    const labelsRef     = useRef({ enemy: t.canvasEnemy, yours: t.canvasYours });
    useEffect(() => { labelsRef.current = { enemy: t.canvasEnemy, yours: t.canvasYours }; }, [t]);

    const BaseComponent = SKIN_BASES[skin] || BaseSiberia;
    const isEnemy = phase === 'infiltrate';

    // ── xterm setup ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!termBodyRef.current) return;
        termBodyRef.current.innerHTML = '';
        const term = new Terminal({
            cursorBlink: true, fontFamily: '"Share Tech Mono", monospace', fontSize: 13,
            theme: { background: 'transparent', foreground: '#00ff41', cursor: '#00ff41' },
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
        const onResize = () => { try { fitAddon.fit(); } catch (_) {} };
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            term.dispose();
            if (ws.readyState <= WebSocket.OPEN) ws.close();
        };
    }, [arenaID, playerID, phase]);

    useEffect(() => {
        if (!termWinRef.current) return;
        const ro = new ResizeObserver(() => { try { fitAddonRef.current?.fit(); } catch (_) {} });
        ro.observe(termWinRef.current);
        return () => ro.disconnect();
    }, []);

    // ── Drag terminal ─────────────────────────────────────────────────────────
    useEffect(() => {
        const win = termWinRef.current;
        const handle = document.getElementById('term-drag-handle');
        if (!win || !handle) return;
        let dragging = false, ox = 0, oy = 0;
        const onDown = (e) => {
            if (e.target.closest('.resize-hint')) return;
            dragging = true;
            const r = win.getBoundingClientRect();
            ox = e.clientX - r.left; oy = e.clientY - r.top;
            e.preventDefault();
        };
        const onMove = (e) => {
            if (!dragging) return;
            win.style.left = `${Math.max(0, Math.min(window.innerWidth - win.offsetWidth, e.clientX - ox))}px`;
            win.style.top  = `${Math.max(0, Math.min(window.innerHeight - win.offsetHeight - 52, e.clientY - oy))}px`;
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

    // ── Game Over ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            const p = e.detail;
            setGameOverInfo({ won: p.you_won, draw: p.draw || false });
            if (wsRef.current) wsRef.current.close();
        };
        window.addEventListener('gameOver', handler);
        return () => window.removeEventListener('gameOver', handler);
    }, []);

    // Stop canvas animation and clear on game over
    useEffect(() => {
        if (!gameOverInfo) return;
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        if (lineCanvasRef.current) {
            lineCanvasRef.current.getContext('2d').clearRect(0, 0, lineCanvasRef.current.width, lineCanvasRef.current.height);
        }
    }, [gameOverInfo]);

    // ── Incoming ability animation (enemy attacked me) ────────────────────────
    useEffect(() => {
        if (!incomingAbility) return;
        fireAnimation(incomingAbility.name, 'incoming');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incomingAbility?.id]);

    // ── Line canvas resize ────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = lineCanvasRef.current;
        if (!canvas) return;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // ── Animated line: terminal side-wall → building antenna ──────────────────
    useEffect(() => {
        const canvas = lineCanvasRef.current;
        if (!canvas) return;
        let offset = 0;

        const getAntenna = (side) => {
            const el = document.querySelector(side === 'left' ? '.left-base-pos' : '.right-base-pos');
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            const frac = ANTENNA_FRAC[skin] || { x: 0.5, y: 0.05 };
            // right base is scaleX(-1); since x=0.5 the horizontal center stays the same
            return {
                x: rect.left + rect.width * frac.x,
                y: rect.top  + rect.height * frac.y,
            };
        };

        const draw = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const termWin = termWinRef.current;
            if (!termWin) { rafRef.current = requestAnimationFrame(draw); return; }

            const tRect  = termWin.getBoundingClientRect();
            // Start from the terminal side wall that faces the target base
            const sx = isEnemy ? tRect.right  : tRect.left;
            const sy = tRect.top + tRect.height / 2;

            // End at the antenna of the connected base
            const antennaSide = isEnemy ? 'right' : 'left';
            const ant = getAntenna(antennaSide);
            if (!ant) { rafRef.current = requestAnimationFrame(draw); return; }

            const color = isEnemy ? '#C0704A' : '#00ff41';
            const label = isEnemy ? labelsRef.current.enemy : labelsRef.current.yours;

            // Bezier control point — arc upward
            const cpx = (sx + ant.x) / 2;
            const cpy = Math.min(sy, ant.y) - 55;

            offset = (offset + 0.5) % 26;

            // Glow pass
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.globalAlpha = 0.1;
            ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpx, cpy, ant.x, ant.y); ctx.stroke();
            ctx.restore();

            // Main dashed line
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 5]); ctx.lineDashOffset = -offset; ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpx, cpy, ant.x, ant.y); ctx.stroke();
            ctx.restore();

            // Endpoint dot at antenna
            ctx.save();
            ctx.fillStyle = color; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.arc(ant.x, ant.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // Start dot at terminal wall
            ctx.save();
            ctx.fillStyle = color; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // Label at mid-arc
            ctx.save();
            ctx.font = '9px "Share Tech Mono", monospace';
            ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.globalAlpha = 0.7;
            ctx.fillText(label, cpx, cpy + 22);
            ctx.restore();

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(rafRef.current);
            if (lineCanvasRef.current) {
                lineCanvasRef.current.getContext('2d').clearRect(0, 0, lineCanvasRef.current.width, lineCanvasRef.current.height);
            }
        };
    }, [phase, skin]);

    // ── Canvas animation helpers ──────────────────────────────────────────────

    const getBaseScreenPos = (side) => {
        if (!arenaRef.current) return { x: 0, y: 0 };
        return {
            x: arenaRef.current.offsetWidth  * (side === 'left' ? 0.18 : 0.82),
            y: arenaRef.current.offsetHeight * 0.67,
        };
    };

    const showNotif = (msg) => {
        setNotif({ show: true, msg });
        setTimeout(() => setNotif({ show: false, msg: '' }), 3000);
    };

    /** direction: 'outgoing' (you attack enemy) | 'incoming' (enemy attacks you) */
    const fireAnimation = (name, direction = 'outgoing') => {
        if (!canvasRef.current || !arenaRef.current) return;
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');
        const arena  = arenaRef.current;
        canvas.width  = arena.offsetWidth;
        canvas.height = arena.offsetHeight;

        const left  = getBaseScreenPos('left');
        const right = getBaseScreenPos('right');
        const col   = ABILITY_DEFS[name]?.color || '#C0A050';

        if (direction === 'outgoing') {
            if (name === 'repair')     animRepair(ctx, canvas, left.x, left.y);
            else if (name === 'sonar') animSonar(ctx, canvas, left.x, left.y, right.x, right.y, col);
            else                        animProjectile(ctx, canvas, arena, left.x, left.y, right.x, right.y, col);
        } else {
            // Incoming: effect travels from RIGHT (enemy) → LEFT (my base)
            if (name === 'sonar')      animSonar(ctx, canvas, right.x, right.y, left.x, left.y, col);
            else                        animProjectile(ctx, canvas, arena, right.x, right.y, left.x, left.y, col);
        }
    };

    const animProjectile = (ctx, canvas, arena, sx, sy, tx, ty, col) => {
        const trail = []; let tick = 0;
        const iv = setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); tick++;
            const prog = tick / 52;
            const ease = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
            const cx = sx + (tx - sx) * ease;
            const cy = sy + (ty - sy) * ease - Math.sin(prog * Math.PI) * (arena.offsetHeight * 0.38);
            trail.push({ x: cx, y: cy }); if (trail.length > 22) trail.shift();
            trail.forEach((p, i) => {
                const a = (i / trail.length) * 0.55;
                const r = 1.5 + (i / trail.length) * 3.5;
                ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = col + Math.floor(a * 255).toString(16).padStart(2, '0'); ctx.fill();
            });
            ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = col; ctx.shadowBlur = 16; ctx.shadowColor = col; ctx.fill(); ctx.restore();
            if (tick >= 52) {
                clearInterval(iv); let ring = 0;
                const ex = setInterval(() => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); ring++;
                    ctx.save(); ctx.beginPath(); ctx.arc(tx, ty, ring * 10, 0, Math.PI * 2);
                    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.globalAlpha = Math.max(0, 1 - ring * 0.26);
                    ctx.stroke(); ctx.restore();
                    if (ring >= 4) { clearInterval(ex); ctx.clearRect(0, 0, canvas.width, canvas.height); }
                }, 70);
            }
        }, 16);
    };

    const animRepair = (ctx, canvas, cx, cy) => {
        const col = '#4A8C42'; let tick = 0;
        const iv = setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); tick++;
            const prog = tick / 65;
            if (prog > 1) { clearInterval(iv); ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
            const maxR = (canvas.offsetWidth || 400) * 0.12;
            for (let ring = 0; ring < 3; ring++) {
                const r  = maxR * (0.5 + ring * 0.25) * Math.sin(prog * Math.PI);
                const al = (1 - prog) * (1 - ring * 0.28);
                ctx.beginPath();
                for (let s = 0; s < 6; s++) {
                    const a = (s / 6) * Math.PI * 2 - Math.PI / 6;
                    s === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                        : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
                }
                ctx.closePath(); ctx.strokeStyle = col; ctx.lineWidth = 2 - ring * 0.5; ctx.globalAlpha = al; ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(cx, cy, 10 * (1 - prog), 0, Math.PI * 2);
            ctx.fillStyle = col; ctx.globalAlpha = (1 - prog) * 0.5; ctx.fill(); ctx.globalAlpha = 1;
        }, 16);
    };

    // Sonar: scan rings emanating FROM src TOWARD dst (for directionality)
    const animSonar = (ctx, canvas, srcX, srcY, dstX, dstY, col) => {
        const maxR = Math.hypot(dstX - srcX, dstY - srcY) * 1.2;
        let frame = 0;
        const iv = setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); frame++;
            for (let w = 0; w < 4; w++) {
                const delay = w * 18; if (frame < delay) continue;
                const prog = Math.min((frame - delay) / 75, 1);
                const r    = prog * maxR;
                const al   = (1 - prog) * 0.65;
                ctx.beginPath(); ctx.arc(srcX, srcY, r, 0, Math.PI * 2);
                ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = al; ctx.stroke();
                // Directional scanner lines pointing toward dst
                const baseAngle = Math.atan2(dstY - srcY, dstX - srcX);
                for (let d = -1; d <= 1; d++) {
                    const ang = baseAngle + d * 0.4 + prog * 0.3;
                    ctx.beginPath(); ctx.moveTo(srcX, srcY);
                    ctx.lineTo(srcX + r * Math.cos(ang), srcY + r * Math.sin(ang));
                    ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.globalAlpha = al * 0.4; ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
            if (frame > 75 + 3 * 18 + 15) { clearInterval(iv); ctx.clearRect(0, 0, canvas.width, canvas.height); }
        }, 16);
    };

    const useAbility = async (name) => {
        if (phase !== 'infiltrate') { showNotif(t.notifOnlyInfil); return; }
        if (usedAbilities.has(name)) return;

        // For repair: don't pre-mark as used — wait for server confirmation
        if (name !== 'repair') {
            setUsedAbilities(prev => new Set([...prev, name]));
        }

        // Trigger OUTGOING animation locally
        fireAnimation(name, 'outgoing');
        const effect = ABILITY_EFFECTS[name]?.[lang] || ABILITY_EFFECTS[name]?.en || name.toUpperCase();
        showNotif(effect);
        try {
            const res = await fetch('/api/ability', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arena_id: arenaID, player_id: playerID, ability: name }),
            });
            if (name === 'repair') {
                if (res.ok) {
                    // Consumed successfully — mark as used
                    setUsedAbilities(prev => new Set([...prev, name]));
                } else {
                    // Window expired or no attack to repair — keep it available
                    const txt = await res.text();
                    showNotif(`REPAIR: ${txt.trim() || 'window expired'}`);
                }
            }
        } catch (e) { console.error(e); }
    };

    const gameOverTitle = gameOverInfo
        ? (gameOverInfo.draw ? t.drawTitle : (gameOverInfo.won ? t.winTitle : t.loseTitle))
        : '';
    const gameOverSub = gameOverInfo
        ? (gameOverInfo.draw ? t.subDraw : (gameOverInfo.won ? t.subWin : t.subLose))
        : '';

    const SkinDecorations = () => {
        if (skin === 'skin-classic')   return <SiberiaDecorations />;
        if (skin === 'skin-cyberpunk') return <RetroDecorations />;
        if (skin === 'skin-wasteland') return <WastelandDecorations />;
        return null;
    };

    return (
        <div className="arena-wrapper">
            <div id="arena" ref={arenaRef}>
                <div className="top-band"/>
                <div className="band-separator"/>
                <div className="bottom-band"/>
                <div className="ground-deco"/>

                <SkinDecorations />
                {skin === 'skin-dev-mode' && <DevModeDecorations />}

                {/* Player base — left */}
                <div className="base-container left-base-pos">
                    <BaseComponent />
                </div>
                {/* Enemy base — right (mirrored) */}
                <div className="base-container right-base-pos">
                    <BaseComponent />
                </div>

                <canvas id="strike-canvas" ref={canvasRef}/>

                {/* Phase bar */}
                <div id="phase-bar">
                    <span className="phase-label">{playerID ?? '—'}</span>
                    <span id="phase-name" style={{ color: isEnemy ? '#C0704A' : '#4A8C42' }}>
            {isEnemy ? t.phaseInfil : t.phaseSetup}
          </span>
                    <span className="phase-nuke">nuke: /bin/nuke_system</span>
                </div>

                <div id="notif" className={notif.show ? 'show' : ''}>{notif.msg}</div>

                {/* Game over overlay */}
                {gameOverInfo && (
                    <div id="winner-overlay" className="show" style={{ display: 'flex' }}>
                        <div className={`winner-title ${gameOverInfo.draw ? 'draw' : gameOverInfo.won ? 'won' : 'lost'}`}>
                            {gameOverTitle}
                        </div>
                        <div className="winner-sub">{gameOverSub}</div>
                        <button className="btn btn-green" style={{ width: 'auto', padding: '.6rem 2rem' }}
                                onClick={() => { setGameOverInfo(null); onReturnToLobby?.(); }}>
                            {t.btnRestart}
                        </button>
                    </div>
                )}
            </div>

            {/* Animated connection line — antenna to terminal */}
            <canvas
                ref={lineCanvasRef}
                style={{
                    position: 'fixed', inset: 0, pointerEvents: 'none',
                    zIndex: 199, display: gameOverInfo ? 'none' : 'block',
                }}
            />

            {/* Terminal window — bigger default size */}
            <div id="terminal-win" ref={termWinRef} style={{ display: gameOverInfo ? 'none' : 'flex' }}>
                {/* Left tail: setup → own base on left */}
                <div className="term-bubble-tail-left" style={{ display: isEnemy ? 'none' : 'block' }}/>
                {/* Right tail: infiltrate → enemy base on right */}
                <div className="term-bubble-tail-right" style={{ display: isEnemy ? 'block' : 'none' }}/>

                <div className="term-titlebar" id="term-drag-handle">
                    <div className="term-btns">
                        <span className="term-btn"/><span className="term-btn"/>
                        <span className="term-btn" style={{ background: '#4A8C42' }}/>
                    </div>
                    <span>{t.termTitle}</span>
                    <span className="resize-hint" title="Drag corner to resize">⤢</span>
                </div>
                <div id="term-body" ref={termBodyRef}
                     style={{ flex: 1, padding: '4px', overflow: 'hidden', background: 'rgba(0,0,0,0.85)' }}/>
            </div>

            {/* Footer */}
            <footer id="arena-footer">
                <div className="footer-left">
                    <span className="footer-tag">{t.footerArena}</span>
                    <span className="footer-id">{arenaID ?? '—'}</span>
                </div>
                <div id="pouch">
                    {abilities.length === 0 ? (
                        <span className="pouch-empty-msg">
              {phase === 'setup' ? t.pouchHint : t.pouchEmpty}
            </span>
                    ) : (
                        abilities.map((name) => {
                            const def  = ABILITY_DEFS[name] || { icon: '?', name: name.toUpperCase(), color: '#666' };
                            const used = usedAbilities.has(name);
                            const tip  = used ? t.abilityUsed : (ABILITY_EFFECTS[name]?.[lang] || def.name);
                            return (
                                <div key={name}
                                     className={`ability-pill${used ? ' used' : ''}`}
                                     onClick={() => useAbility(name)}
                                     style={{ '--ab-color': used ? '#2a2a2a' : def.color }}
                                     title={tip}>
                                    <div className="ab-cd-progress" style={{ width: 0 }}/>
                                    <span className="ab-icon">{used ? '—' : def.icon}</span>
                                    <span className="ab-name">{def.name}</span>
                                    {used
                                        ? <span className="ab-used-tag">{t.abilityUsedLabel}</span>
                                        : <span className="ab-key">{t.abilityUseLabel}</span>
                                    }
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="footer-right">
                    <span className="footer-tag">{t.footerRole}</span>
                    <span className="footer-role" style={{ color: role === 'host' ? '#4A8C42' : '#C0704A' }}>
            {role?.toUpperCase() ?? '—'}
          </span>
                </div>
            </footer>
        </div>
    );
}