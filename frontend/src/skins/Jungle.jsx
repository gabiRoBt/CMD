/* eslint-disable react/prop-types */
/*
  JUNGLE VIBE SKIN — Arched Bridge Redesign
  ──────────────────────────────────────────
  Design:
    Open sky clearly visible (no dark walls).
    Individual trees placed BESIDE bases (trunks don't overlap bases).
    Dramatic arched rope bridge spanning the clearing (~280px arch).
    Flowing river in the center.
    Animals perched on/near trees.
    Birds crossing the open sky.

  z-index layers:
    z-1   sky atmosphere tint
    z-3   trees (behind bases)
    z-4   river + ground mist
    z-5   arched bridge
    z-7   animals (monkey, parrot)
    z-9   bird flocks
    z-10  base buildings (arena.css)
    z-12  fireflies
*/

// ═══════════════════════════════════════════════════════════════
//  BASE BUILDING — military bunker with fixed antenna
// ═══════════════════════════════════════════════════════════════
export function BaseJungle() {
  return (
    <svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <linearGradient id="jgWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#3d4a2a"/><stop offset="50%" stopColor="#2a3319"/>
          <stop offset="100%" stopColor="#1a2210"/>
        </linearGradient>
        <linearGradient id="jgTower" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#2a3319"/><stop offset="100%" stopColor="#1a2210"/>
        </linearGradient>
        <linearGradient id="jgSandbag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#8a7a4a"/><stop offset="100%" stopColor="#6a5a30"/>
        </linearGradient>
        <linearGradient id="jgLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#c8f080" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#c8f080" stopOpacity="0"/>
        </linearGradient>
        <filter id="jgShadow">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#0a1a06" floodOpacity="0.65"/>
        </filter>
        <pattern id="jgMoss" x="0" y="0" width="18" height="14" patternUnits="userSpaceOnUse">
          <rect width="18" height="14" fill="transparent"/>
          <rect x="1"  y="1"  width="7"  height="5"  fill="#3a4824" rx="0.4" opacity="0.6"/>
          <rect x="10" y="1"  width="7"  height="5"  fill="#354220" rx="0.4" opacity="0.5"/>
          <rect x="4"  y="8"  width="10" height="5"  fill="#3d4a26" rx="0.4" opacity="0.55"/>
        </pattern>
      </defs>
      <rect x="0" y="140" width="220" height="20" fill="#141e0a"/>
      {[10,32,60,85,110,135,158,185,205].map((x,i)=>(
        <ellipse key={i} cx={x} cy={140} rx={8+i%3*4} ry="3" fill="#1e2a0f" opacity="0.9"/>
      ))}
      <polygon points="18,140 14,52 56,40 164,40 206,52 202,140" fill="url(#jgWall)" filter="url(#jgShadow)"/>
      <polygon points="18,140 14,52 56,40 164,40 206,52 202,140" fill="url(#jgMoss)" opacity="0.9"/>
      <polygon points="18,140 14,52 56,40 164,40 206,52 202,140" fill="none" stroke="#4a5e28" strokeWidth="1.4" opacity="0.5"/>
      {[65,80,95,112,128].map((y,i)=>(
        <line key={i} x1={14+(y-52)*0.10} y1={y} x2={206-(y-52)*0.10} y2={y} stroke="#384a1e" strokeWidth="1.2" opacity="0.5"/>
      ))}
      {[14,22,30,38,46].map((x,i)=><ellipse key={i} cx={x+3} cy={52} rx="6" ry="4" fill="url(#jgSandbag)" opacity="0.95"/>)}
      {[172,180,188,196,204].map((x,i)=><ellipse key={i} cx={x+1} cy={52} rx="6" ry="4" fill="url(#jgSandbag)" opacity="0.95"/>)}
      {[60,72,84,96,108,120,132,144,156].map((x,i)=><ellipse key={i} cx={x} cy={40} rx="7" ry="4.5" fill="url(#jgSandbag)" opacity="0.90"/>)}
      {/* Left tower */}
      <rect x="8"   y="36" width="40" height="104" fill="url(#jgTower)" stroke="#4a5e28" strokeWidth="1.2"/>
      <rect x="6"   y="28" width="44" height="12"  fill="#2a3818"/>
      {[[14,50],[14,70],[14,92],[14,112],[38,50],[38,70],[38,92],[38,112]].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="8" height="5" fill="#0f1a08" rx="1"/>
      ))}
      <rect x="16" y="56" width="16" height="12" fill="#0a1408" rx="1"/>
      <rect x="17" y="57" width="14" height="10" fill="#1e3a08" opacity="0.4" rx="1"/>
      <line x1="24" y1="57" x2="24" y2="67" stroke="#2a4010" strokeWidth="0.8"/>
      <line x1="17" y1="62" x2="31" y2="62" stroke="#2a4010" strokeWidth="0.8"/>
      <path d="M28,28 L8,140 L48,140 Z" fill="url(#jgLight)" opacity="0.45"/>
      {/* Right tower */}
      <rect x="172" y="36" width="40" height="104" fill="url(#jgTower)" stroke="#4a5e28" strokeWidth="1.2"/>
      <rect x="170" y="28" width="44" height="12"  fill="#2a3818"/>
      {[[176,50],[176,70],[176,92],[176,112],[200,50],[200,70],[200,92],[200,112]].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="8" height="5" fill="#0f1a08" rx="1"/>
      ))}
      <rect x="186" y="56" width="16" height="12" fill="#0a1408" rx="1"/>
      <rect x="187" y="57" width="14" height="10" fill="#1e3a08" opacity="0.4" rx="1"/>
      <line x1="194" y1="57" x2="194" y2="67" stroke="#2a4010" strokeWidth="0.8"/>
      <line x1="187" y1="62" x2="201" y2="62" stroke="#2a4010" strokeWidth="0.8"/>
      <path d="M192,28 L172,140 L212,140 Z" fill="url(#jgLight)" opacity="0.45"/>
      {/* Center entrance */}
      <rect x="84" y="90" width="52" height="50" fill="#0f1a08"/>
      <path d="M84,110 Q110,88 136,110" fill="#0f1a08" stroke="#3a5020" strokeWidth="2"/>
      <rect x="86"  y="110" width="24" height="30" fill="#1a2810" rx="1"/>
      <rect x="110" y="110" width="24" height="30" fill="#162208" rx="1"/>
      <line x1="110" y1="110" x2="110" y2="140" stroke="#2e4018" strokeWidth="2"/>
      {/* ── ANTENNA — brațele V se unesc la bilă (centrat perfect) ── */}
      <line x1="110" y1="40"  x2="110" y2="20"  stroke="#5a7a30" strokeWidth="2"/>
      <line x1="97"  y1="20"  x2="123" y2="20"  stroke="#5a7a30" strokeWidth="1.4"/>
      <line x1="97"  y1="20"  x2="110" y2="8"   stroke="#5a7a30" strokeWidth="1.2"/>
      <line x1="123" y1="20"  x2="110" y2="8"   stroke="#5a7a30" strokeWidth="1.2"/>
      <circle cx="110" cy="8"  r="3.5" fill="#a8e060" opacity="0.94"/>
      <circle cx="110" cy="8"  r="7"   fill="#a8e060" opacity="0.22"/>
      <circle cx="110" cy="8"  r="13"  fill="#a8e060" opacity="0.08"/>
      {/* LED indicators */}
      <circle cx="28"  cy="28"  r="2.5" fill="#22ff44" opacity="0.80" className="jg-led-blink"/>
      <circle cx="192" cy="28"  r="2.5" fill="#22ff44" opacity="0.80" className="jg-led-blink"/>
      {/* ── Jungle base decoration: vines + leaves at building ground level ── */}
      <path d="M10,158 Q55,145 95,151 Q110,154 125,151 Q165,145 210,158"
        fill="none" stroke="#1a4008" strokeWidth="3" opacity="0.72"/>
      <ellipse cx="30"  cy="150" rx="9" ry="5" fill="#1e5210" opacity="0.62" transform="rotate(-22,30,150)"/>
      <ellipse cx="65"  cy="147" rx="8" ry="4" fill="#246014" opacity="0.58" transform="rotate(12,65,147)"/>
      <ellipse cx="110" cy="149" rx="7" ry="4" fill="#1e5010" opacity="0.55"/>
      <ellipse cx="155" cy="147" rx="8" ry="4" fill="#246014" opacity="0.58" transform="rotate(-12,155,147)"/>
      <ellipse cx="190" cy="150" rx="9" ry="5" fill="#1e5210" opacity="0.62" transform="rotate(22,190,150)"/>
      <path d="M8,140 Q4,128 10,116"  fill="none" stroke="#2a5c0e" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18,140 Q14,126 20,114" fill="none" stroke="#326814" strokeWidth="2"   strokeLinecap="round"/>
      <path d="M212,140 Q216,128 210,116" fill="none" stroke="#2a5c0e" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M202,140 Q206,126 200,114" fill="none" stroke="#326814" strokeWidth="2"   strokeLinecap="round"/>
      <ellipse cx="15"  cy="138" rx="16" ry="6" fill="#1c4a0c" opacity="0.80"/>
      <ellipse cx="205" cy="138" rx="16" ry="6" fill="#1c4a0c" opacity="0.80"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  INDIVIDUAL TREES
// ═══════════════════════════════════════════════════════════════

/* Broad-leaf jungle tree with visible trunk & layered canopy */
function BroadTree({ style, flip }) {
  const s = flip
    ? { ...style, transform: `${style?.transform || ''} scaleX(-1)`.trim() }
    : style;
  return (
    <svg style={s} viewBox="0 0 260 520"
         preserveAspectRatio="xMidYMax meet" overflow="visible"
         xmlns="http://www.w3.org/2000/svg">
      {/* Root flare */}
      <path d="M108,520 Q112,500 118,470 L142,470 Q148,500 152,520" fill="#1a0e04"/>
      {/* Trunk */}
      <rect x="118" y="210" width="24" height="260" fill="#1a0e04" rx="5"/>
      <rect x="122" y="210" width="14" height="260" fill="#2a1808" rx="4" opacity="0.4"/>
      {/* Branch extending outward */}
      <path d="M130,290 Q175,268 218,272"
        fill="none" stroke="#1a0e04" strokeWidth="10" strokeLinecap="round"/>
      <path d="M130,290 Q175,268 218,272"
        fill="none" stroke="#2a1808" strokeWidth="5" strokeLinecap="round" opacity="0.3"/>
      {/* Canopy mass */}
      <ellipse cx="130" cy="195" rx="100" ry="70" fill="#14380c" opacity="0.95"/>
      <ellipse cx="95"  cy="158" rx="72"  ry="55" fill="#1a4810" opacity="0.92"/>
      <ellipse cx="168" cy="163" rx="68"  ry="52" fill="#1c4e12" opacity="0.90"/>
      <ellipse cx="130" cy="118" rx="62"  ry="50" fill="#206414" opacity="0.88"/>
      <ellipse cx="130" cy="80"  rx="46"  ry="38" fill="#267818" opacity="0.85"/>
      {/* Sunlit highlights */}
      <ellipse cx="108" cy="130" rx="30" ry="22" fill="#2e8a1e" opacity="0.42"/>
      <ellipse cx="148" cy="98"  rx="24" ry="18" fill="#359a24" opacity="0.30"/>
    </svg>
  );
}

/* Tall, slender jungle tree */
function TallTree({ style, flip }) {
  const s = flip
    ? { ...style, transform: `${style?.transform || ''} scaleX(-1)`.trim() }
    : style;
  return (
    <svg style={s} viewBox="0 0 180 550"
         preserveAspectRatio="xMidYMax meet" overflow="visible"
         xmlns="http://www.w3.org/2000/svg">
      <rect x="82" y="240" width="16" height="310" fill="#1a0e04" rx="4"/>
      <rect x="85" y="240" width="10" height="310" fill="#2a1808" rx="3" opacity="0.4"/>
      <ellipse cx="90" cy="225" rx="72" ry="55" fill="#153c0c" opacity="0.95"/>
      <ellipse cx="66" cy="188" rx="54" ry="45" fill="#1a4a10" opacity="0.92"/>
      <ellipse cx="114" cy="193" rx="50" ry="42" fill="#1c4c12" opacity="0.90"/>
      <ellipse cx="90" cy="150" rx="50" ry="42" fill="#206014" opacity="0.88"/>
      <ellipse cx="90" cy="112" rx="36" ry="32" fill="#256e16" opacity="0.85"/>
      <ellipse cx="76" cy="163" rx="22" ry="16" fill="#2a8018" opacity="0.40"/>
    </svg>
  );
}

/* Palm tree with curved trunk & fronds */
function JunglePalm({ style, flip }) {
  const s = flip
    ? { ...style, transform: `${style?.transform || ''} scaleX(-1)`.trim() }
    : style;
  return (
    <svg style={s} viewBox="0 0 200 500"
         preserveAspectRatio="xMidYMax meet" overflow="visible"
         xmlns="http://www.w3.org/2000/svg">
      <path d="M95,500 Q88,400 90,320 Q94,240 108,175"
        fill="none" stroke="#1a0e04" strokeWidth="14" strokeLinecap="round"/>
      <path d="M95,500 Q88,400 90,320 Q94,240 108,175"
        fill="none" stroke="#281808" strokeWidth="6" opacity="0.45" strokeLinecap="round"/>
      {[[-68,-18],[-48,-48],[-22,-62],[8,-66],[38,-56],[58,-38],[72,-12]].map(([dx,dy],i)=>{
        const ox=108, oy=175, mx=ox+dx*0.42, my=oy+dy*0.42;
        return (
          <path key={i}
            d={`M${ox},${oy} Q${mx},${my} ${ox+dx},${oy+dy}`}
            fill="none"
            stroke={['#1a600e','#216818','#286e1e','#2e7820'][i%4]}
            strokeWidth={5} strokeLinecap="round" opacity="0.92"/>
        );
      })}
      <circle cx="108" cy="175" r="10" fill="#163a0a" opacity="0.90"/>
      <circle cx="102" cy="183" r="4.5" fill="#2a1a08" opacity="0.80"/>
      <circle cx="113" cy="185" r="4"   fill="#261608" opacity="0.75"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CLOUDS — tint: 'white' | 'grey' | 'dark'
// ═══════════════════════════════════════════════════════════════
const CLOUD_TINTS = {
  white: { a:'#ffffff', b:'rgba(220,238,255,0.94)', op:1.00 },
  grey:  { a:'#c8d4e4', b:'rgba(170,190,210,0.90)', op:0.90 },
  dark:  { a:'#8a9eb4', b:'rgba(110,130,155,0.88)', op:0.82 },
};
function Cloud({ style, tint='white', className }) {
  const t = CLOUD_TINTS[tint];
  return (
    <svg style={style} className={className}
         viewBox="0 0 240 88" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60"  cy="62" rx="54" ry="28" fill={t.a} opacity={t.op*0.93}/>
      <ellipse cx="112" cy="48" rx="64" ry="38" fill={t.a} opacity={t.op*0.96}/>
      <ellipse cx="168" cy="60" rx="48" ry="28" fill={t.a} opacity={t.op*0.91}/>
      <ellipse cx="84"  cy="38" rx="40" ry="30" fill={t.a} opacity={t.op*0.96}/>
      <ellipse cx="142" cy="34" rx="36" ry="28" fill={t.a} opacity={t.op*0.93}/>
      <ellipse cx="112" cy="70" rx="72" ry="14" fill={t.b}/>
    </svg>
  );
}
function SmallCloud({ style, tint='white', className }) {
  const t = CLOUD_TINTS[tint];
  return (
    <svg style={style} className={className}
         viewBox="0 0 160 65" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="46"  cy="46" rx="42" ry="22" fill={t.a} opacity={t.op*0.88}/>
      <ellipse cx="88"  cy="34" rx="48" ry="30" fill={t.a} opacity={t.op*0.91}/>
      <ellipse cx="124" cy="44" rx="36" ry="22" fill={t.a} opacity={t.op*0.85}/>
      <ellipse cx="68"  cy="24" rx="32" ry="24" fill={t.a} opacity={t.op*0.90}/>
      <ellipse cx="88"  cy="52" rx="56" ry="12" fill={t.b}/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BIRD FLOCK — V-formation
// ═══════════════════════════════════════════════════════════════
function BirdFlock({ style, flockClass }) {
  const birds = [
    { x:  0, y:  0, s:1.00, d:'0s'    },
    { x: 22, y: -8, s:0.86, d:'0.10s' },
    { x:-22, y: -8, s:0.86, d:'0.10s' },
    { x: 44, y:-15, s:0.74, d:'0.20s' },
    { x:-44, y:-15, s:0.74, d:'0.20s' },
    { x: 66, y:-21, s:0.62, d:'0.30s' },
    { x:-66, y:-21, s:0.62, d:'0.30s' },
  ];
  return (
    <svg style={style} viewBox="-88 -36 196 50"
         xmlns="http://www.w3.org/2000/svg" className={flockClass}>
      {birds.map((b,i)=>(
        <g key={i} transform={`translate(${b.x},${b.y}) scale(${b.s})`}>
          <path d="M-10,-5 L0,0 L10,-5"
            fill="none" stroke="#0a1a06" strokeWidth="3"
            strokeLinecap="round"
            className="jg-birdwing" style={{ animationDelay:b.d }}
            opacity={0.88 - i*0.04}/>
        </g>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BRANCH SCENES — branch + foliage + animal, all in one SVG
// ═══════════════════════════════════════════════════════════════

function MonkeyBranch({ style }) {
  return (
    <svg style={{ ...style, overflow:'visible' }}
         viewBox="0 0 370 155" xmlns="http://www.w3.org/2000/svg"
         className="jg-monkey-bob">
      <ellipse cx="52"  cy="65"  rx="58" ry="44" fill="#163a0c" opacity="0.90"/>
      <ellipse cx="22"  cy="88"  rx="34" ry="28" fill="#1a4810" opacity="0.86"/>
      <ellipse cx="92"  cy="50"  rx="46" ry="37" fill="#1e5412" opacity="0.83"/>
      <ellipse cx="128" cy="65"  rx="40" ry="34" fill="#204e10" opacity="0.80"/>
      <path d="M0,108 Q160,98 310,102"
        fill="none" stroke="#0a0400" strokeWidth="15" opacity="0.17" strokeLinecap="round"/>
      <path d="M0,106 Q160,96 310,100"
        fill="none" stroke="#1a0e04" strokeWidth="12" strokeLinecap="round"/>
      <path d="M0,106 Q160,96 310,100"
        fill="none" stroke="#2a1808" strokeWidth="6" strokeLinecap="round" opacity="0.35"/>
      <path d="M283,100 Q291,87 299,79"
        fill="none" stroke="#1a0e04" strokeWidth="5" strokeLinecap="round" opacity="0.68"/>
      <path d="M205,101 Q201,113 203,122" fill="none" stroke="#5a3c18" strokeWidth="5.5" strokeLinecap="round"/>
      <path d="M219,101 Q223,113 221,122" fill="none" stroke="#5a3c18" strokeWidth="5.5" strokeLinecap="round"/>
      <ellipse cx="203" cy="122" rx="4.5" ry="2.5" fill="#4a3010" transform="rotate(-8,203,122)"/>
      <ellipse cx="221" cy="122" rx="4.5" ry="2.5" fill="#4a3010" transform="rotate(8,221,122)"/>
      <path d="M227,97 Q240,91 238,82 Q236,75 230,79" fill="none" stroke="#4a3010" strokeWidth="3.5" strokeLinecap="round"/>
      <ellipse cx="211" cy="91" rx="12" ry="13" fill="#5a3c18"/>
      <path d="M200,93 Q194,99 194,105" fill="none" stroke="#5a3c18" strokeWidth="5" strokeLinecap="round"/>
      <path d="M222,93 Q228,99 228,105" fill="none" stroke="#5a3c18" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="211" cy="77" r="11" fill="#5a3c18"/>
      <ellipse cx="211" cy="79" rx="7.5" ry="7" fill="#c8a060" opacity="0.85"/>
      <circle cx="206" cy="74" r="2.2" fill="#1a0a00"/>
      <circle cx="216" cy="74" r="2.2" fill="#1a0a00"/>
      <circle cx="206.5" cy="73.5" r="0.8" fill="white" opacity="0.7"/>
      <circle cx="216.5" cy="73.5" r="0.8" fill="white" opacity="0.7"/>
      <circle cx="201" cy="75" r="4.5" fill="#5a3c18"/>
      <circle cx="201" cy="75" r="2.8" fill="#c8a060" opacity="0.6"/>
      <circle cx="221" cy="75" r="4.5" fill="#5a3c18"/>
      <circle cx="221" cy="75" r="2.8" fill="#c8a060" opacity="0.6"/>
    </svg>
  );
}

function ParrotBranch({ style }) {
  return (
    <svg style={{ ...style, overflow:'visible' }}
         viewBox="0 0 320 130" xmlns="http://www.w3.org/2000/svg"
         className="jg-parrot">
      <ellipse cx="268" cy="52"  rx="52" ry="40" fill="#163a0c" opacity="0.90"/>
      <ellipse cx="298" cy="76"  rx="30" ry="26" fill="#1a4810" opacity="0.86"/>
      <ellipse cx="232" cy="42"  rx="44" ry="34" fill="#1e5412" opacity="0.83"/>
      <ellipse cx="196" cy="57"  rx="38" ry="32" fill="#204e10" opacity="0.80"/>
      <path d="M320,91 Q190,82 58,86"
        fill="none" stroke="#0a0400" strokeWidth="15" opacity="0.17" strokeLinecap="round"/>
      <path d="M320,89 Q190,80 58,84"
        fill="none" stroke="#1a0e04" strokeWidth="12" strokeLinecap="round"/>
      <path d="M320,89 Q190,80 58,84"
        fill="none" stroke="#2a1808" strokeWidth="6" strokeLinecap="round" opacity="0.35"/>
      <path d="M80,84 Q72,71 66,63"
        fill="none" stroke="#1a0e04" strokeWidth="5" strokeLinecap="round" opacity="0.68"/>
      <path d="M118,94 Q124,104 130,112" fill="none" stroke="#18a028" strokeWidth="4" strokeLinecap="round"/>
      <path d="M116,96 Q120,106 122,114" fill="none" stroke="#148820" strokeWidth="2.5" opacity="0.8" strokeLinecap="round"/>
      <ellipse cx="120" cy="82" rx="9"  ry="16" fill="#18a028" opacity="0.88" transform="rotate(8,120,82)"/>
      <ellipse cx="120" cy="82" rx="5.5"ry="12" fill="#24c038" opacity="0.65" transform="rotate(8,120,82)"/>
      <ellipse cx="110" cy="80" rx="11" ry="16" fill="#22b832" opacity="0.95"/>
      <ellipse cx="108" cy="74" rx="7"  ry="6"  fill="#e03c1c" opacity="0.90"/>
      <circle cx="104" cy="64" r="10" fill="#1e9a2c"/>
      <ellipse cx="106" cy="63" rx="5.5"ry="4.5" fill="#e8cc28" opacity="0.90"/>
      <path d="M97,65 Q92,68 95,71 Q98,69 97,65" fill="#c8a018"/>
      <line x1="97" y1="68" x2="95" y2="68" stroke="#a07c10" strokeWidth="0.8"/>
      <circle cx="101" cy="63" r="2.5" fill="#0e0800"/>
      <circle cx="100.5" cy="62.5" r="0.9" fill="white" opacity="0.7"/>
      <path d="M96,61 Q104,55 112,61" fill="none" stroke="#1838d8" strokeWidth="3.5" strokeLinecap="round" opacity="0.78"/>
    </svg>
  );
}

function SnakeBranch({ style }) {
  return (
    <svg style={{ ...style, overflow:'visible' }}
         viewBox="0 0 350 140" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="58"  cy="56"  rx="54" ry="42" fill="#163a0c" opacity="0.90"/>
      <ellipse cx="26"  cy="78"  rx="34" ry="28" fill="#1a4810" opacity="0.86"/>
      <ellipse cx="98"  cy="42"  rx="44" ry="36" fill="#1e5412" opacity="0.83"/>
      <ellipse cx="133" cy="57"  rx="38" ry="32" fill="#204e10" opacity="0.78"/>
      <path d="M0,102 Q155,92 300,96"
        fill="none" stroke="#0a0400" strokeWidth="15" opacity="0.17" strokeLinecap="round"/>
      <path d="M0,100 Q155,90 300,94"
        fill="none" stroke="#1a0e04" strokeWidth="12" strokeLinecap="round"/>
      <path d="M0,100 Q155,90 300,94"
        fill="none" stroke="#2a1808" strokeWidth="6" strokeLinecap="round" opacity="0.35"/>
      <path d="M274,94 Q282,81 290,74"
        fill="none" stroke="#1a0e04" strokeWidth="5" strokeLinecap="round" opacity="0.68"/>
      <path d="M192,91 Q172,81 182,71 Q198,61 183,53 Q170,47 178,39"
        fill="none" stroke="#4e8c14" strokeWidth="7.5" strokeLinecap="round"/>
      <path d="M192,91 Q172,81 182,71 Q198,61 183,53 Q170,47 178,39"
        fill="none" stroke="#2a5808" strokeWidth="3.5" strokeDasharray="5,3"
        strokeLinecap="round" opacity="0.65"/>
      <ellipse cx="180" cy="37" rx="8"   ry="5.5" fill="#5c9818" transform="rotate(15,180,37)"/>
      <ellipse cx="181" cy="36" rx="5.5" ry="3.5" fill="#4a8010" transform="rotate(15,181,36)"/>
      <circle  cx="185" cy="34" r="1.8" fill="#1a0a00"/>
      <circle  cx="185.5" cy="33.5" r="0.6" fill="#ffa000" opacity="0.8"/>
      <path d="M187,39 L192,37 M192,37 L194,35 M192,37 L194,39"
        fill="none" stroke="#cc2020" strokeWidth="1" strokeLinecap="round" opacity="0.9"/>
    </svg>
  );
}


// ═══════════════════════════════════════════════════════════════
//  BRANCH STUB — a thick branch extending from the tree canopy
//  to give animals a perch.  Left-to-right by default; flip for
//  right-hand trees.
// ═══════════════════════════════════════════════════════════════
function BranchStub({ style, flip }) {
  const s = flip
    ? { ...style, transform:`${style?.transform||''} scaleX(-1)`.trim() }
    : style;
  return (
    <svg style={{ ...s, overflow:'visible' }}
         viewBox="0 0 180 32" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <path d="M0,18 Q80,12 165,15"
        fill="none" stroke="#0a0400" strokeWidth="14" opacity="0.15" strokeLinecap="round"/>
      {/* Main branch */}
      <path d="M0,16 Q80,10 165,13"
        fill="none" stroke="#1a0e04" strokeWidth="11" strokeLinecap="round"/>
      <path d="M0,16 Q80,10 165,13"
        fill="none" stroke="#2a1808" strokeWidth="5" strokeLinecap="round" opacity="0.38"/>
      {/* Small twig near tip */}
      <path d="M140,13 Q148,2 155,-4"
        fill="none" stroke="#1a0e04" strokeWidth="5" strokeLinecap="round" opacity="0.65"/>
      {/* Leaf cluster at tip */}
      <ellipse cx="163" cy="11" rx="16" ry="10" fill="#1d6014" opacity="0.82"/>
      <ellipse cx="150" cy="14" rx="13" ry="8"  fill="#236018" opacity="0.75"/>
      <ellipse cx="158" cy="5"  rx="11" ry="7"  fill="#2a7020" opacity="0.68"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BRANCH SNAKE — snake coiled up on a branch
// ═══════════════════════════════════════════════════════════════
function BranchSnake({ style }) {
  return (
    <svg style={{ ...style, overflow:'visible' }}
         viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg">
      <path d="M22,8 Q6,18 16,34 Q32,46 14,60 Q4,70 20,72"
        fill="none" stroke="#4e8c14" strokeWidth="7" strokeLinecap="round"/>
      <path d="M22,8 Q6,18 16,34 Q32,46 14,60 Q4,70 20,72"
        fill="none" stroke="#2a5808" strokeWidth="3" strokeDasharray="5,3"
        strokeLinecap="round" opacity="0.65"/>
      <ellipse cx="22" cy="6"  rx="7.5" ry="5"   fill="#5c9818" transform="rotate(10,22,6)"/>
      <ellipse cx="23" cy="5"  rx="5.5" ry="3.5" fill="#4a8010" transform="rotate(10,23,5)"/>
      <circle  cx="26" cy="3"  r="1.8" fill="#1a0a00"/>
      <circle  cx="26.5" cy="2.5" r="0.6" fill="#ffa000" opacity="0.8"/>
      <path d="M28,7 L33,5 M33,5 L35,3 M33,5 L35,7"
        fill="none" stroke="#cc2020" strokeWidth="0.9" strokeLinecap="round" opacity="0.9"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MONKEY — parallel legs hanging down, swinging in sync
// ═══════════════════════════════════════════════════════════════
function SittingMonkey({ style }) {
  return (
    <svg style={{ ...style, overflow:'visible' }}
         viewBox="0 0 80 112" xmlns="http://www.w3.org/2000/svg"
         className="jg-monkey-bob">

      {/* ── Tail curling up-right ── */}
      <path d="M52,72 Q72,66 74,50 Q76,34 64,32 Q56,30 58,40"
        fill="none" stroke="#4a2e0e" strokeWidth="5" strokeLinecap="round"/>
      <path d="M52,72 Q72,66 74,50 Q76,34 64,32 Q56,30 58,40"
        fill="none" stroke="#7a5228" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>

      {/* ══ THIGHS — short, close together, going slightly down ══ */}
      {/* Left thigh: from pelvis-left down to left knee */}
      <line x1="33" y1="74" x2="28" y2="84"
        stroke="#4a2e0e" strokeWidth="10" strokeLinecap="round"/>
      {/* Right thigh: from pelvis-right down to right knee */}
      <line x1="47" y1="74" x2="52" y2="84"
        stroke="#4a2e0e" strokeWidth="10" strokeLinecap="round"/>

      {/* ══ LEFT SHIN — pivots at left knee (28,84), swings in sync ══ */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="-18,28,84; 18,28,84; -18,28,84"
          keyTimes="0; 0.5; 1"
          dur="1.6s" repeatCount="indefinite" begin="0s"/>
        <line x1="28" y1="84" x2="26" y2="108"
          stroke="#4a2e0e" strokeWidth="9" strokeLinecap="round"/>
        <ellipse cx="26" cy="111" rx="8" ry="3.5" fill="#3a2008"/>
      </g>

      {/* ══ RIGHT SHIN — pivots at right knee (52,84), SAME phase ══ */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="-18,52,84; 18,52,84; -18,52,84"
          keyTimes="0; 0.5; 1"
          dur="1.6s" repeatCount="indefinite" begin="0s"/>
        <line x1="52" y1="84" x2="54" y2="108"
          stroke="#4a2e0e" strokeWidth="9" strokeLinecap="round"/>
        <ellipse cx="54" cy="111" rx="8" ry="3.5" fill="#3a2008"/>
      </g>

      {/* ── Body ── */}
      <ellipse cx="40" cy="62" rx="18" ry="16" fill="#5a3818"/>
      <ellipse cx="40" cy="65" rx="10" ry="9" fill="#c8a060" opacity="0.55"/>

      {/* ── LEFT ARM — resting down-left ── */}
      <path d="M22,58 Q10,64 8,74" fill="none" stroke="#4a2e0e" strokeWidth="7" strokeLinecap="round"/>
      <ellipse cx="7" cy="76" rx="6" ry="3.5" fill="#3a2008" transform="rotate(-10,7,76)"/>

      {/* ── RIGHT ARM — raised up ── */}
      <path d="M58,56 Q68,44 65,30" fill="none" stroke="#4a2e0e" strokeWidth="7" strokeLinecap="round"/>
      <ellipse cx="64" cy="27" rx="6" ry="3.5" fill="#3a2008" transform="rotate(15,64,27)"/>

      {/* ── Neck ── */}
      <rect x="34" y="42" width="12" height="9" fill="#5a3818" rx="4"/>

      {/* ── Head ── */}
      <circle cx="40" cy="28" r="16" fill="#5a3818"/>
      <ellipse cx="40" cy="34" rx="9" ry="7" fill="#c8a060" opacity="0.80"/>

      {/* ── Eyes ── */}
      <circle cx="34" cy="24" r="3.2" fill="#0a0400"/>
      <circle cx="46" cy="24" r="3.2" fill="#0a0400"/>
      <circle cx="33.5" cy="23.5" r="1.1" fill="white" opacity="0.75"/>
      <circle cx="45.5" cy="23.5" r="1.1" fill="white" opacity="0.75"/>

      {/* ── Nose ── */}
      <ellipse cx="40" cy="32" rx="3" ry="2" fill="#3a2008" opacity="0.70"/>
      <circle cx="38" cy="32" r="1" fill="#1a0800" opacity="0.85"/>
      <circle cx="42" cy="32" r="1" fill="#1a0800" opacity="0.85"/>

      {/* ── Smile ── */}
      <path d="M34,37 Q40,42 46,37" fill="none" stroke="#3a2008" strokeWidth="1.5" strokeLinecap="round"/>

      {/* ── Ears ── */}
      <circle cx="24" cy="26" r="5.5" fill="#5a3818"/>
      <circle cx="24" cy="26" r="3.2" fill="#c8a060" opacity="0.55"/>
      <circle cx="56" cy="26" r="5.5" fill="#5a3818"/>
      <circle cx="56" cy="26" r="3.2" fill="#c8a060" opacity="0.55"/>

      {/* ── Fur tuft ── */}
      <path d="M30,13 Q40,6 50,13" fill="none" stroke="#3a2008" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PARROT — perched on a branch
// ═══════════════════════════════════════════════════════════════
function Parrot({ style }) {
  return (
    <svg style={{ ...style, overflow:'visible' }}
         viewBox="0 0 52 62" xmlns="http://www.w3.org/2000/svg"
         className="jg-parrot">
      <path d="M34,38 Q40,48 46,56" fill="none" stroke="#18a028" strokeWidth="4" strokeLinecap="round"/>
      <path d="M32,40 Q36,50 38,58" fill="none" stroke="#148820" strokeWidth="2.5" opacity="0.8" strokeLinecap="round"/>
      <ellipse cx="36" cy="26" rx="9"  ry="16" fill="#18a028" opacity="0.88" transform="rotate(8,36,26)"/>
      <ellipse cx="36" cy="26" rx="5.5"ry="12" fill="#24c038" opacity="0.65" transform="rotate(8,36,26)"/>
      <ellipse cx="26" cy="24" rx="11" ry="16" fill="#22b832" opacity="0.95"/>
      <ellipse cx="24" cy="18" rx="7"  ry="6"  fill="#e03c1c" opacity="0.90"/>
      <circle cx="20" cy="8"  r="10" fill="#1e9a2c"/>
      <ellipse cx="22" cy="7" rx="5.5"ry="4.5" fill="#e8cc28" opacity="0.90"/>
      <path d="M13,9 Q8,12 11,15 Q14,13 13,9" fill="#c8a018"/>
      <line x1="13" y1="12" x2="11" y2="12" stroke="#a07c10" strokeWidth="0.8"/>
      <circle cx="17" cy="7" r="2.5" fill="#0e0800"/>
      <circle cx="16.5" cy="6.5" r="0.9" fill="white" opacity="0.7"/>
      <path d="M12,5 Q20,-1 28,5" fill="none" stroke="#1838d8" strokeWidth="3.5" strokeLinecap="round" opacity="0.78"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FLOWING RIVER — in the center clearing
// ═══════════════════════════════════════════════════════════════
function FlowingRiver() {
  const ripples = Array.from({length:9},(_,i)=>({
    id:i, delay:`${(i*0.34).toFixed(2)}s`, dur:'3.0s',
  }));
  return (
    <svg style={{
      position:'absolute', top:'40%', left:0, width:'100%', height:'60%',
      zIndex:4, pointerEvents:'none',
    }} viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <clipPath id="jgRivClip">
          <path d="
            M415,0 C448,130 446,295 374,415 C336,478 344,544 362,600
            L474,600 C488,544 508,478 530,415 C564,295 548,130 468,0 Z
          "/>
        </clipPath>
        <linearGradient id="jgRivG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0c4030" stopOpacity="1"/>
          <stop offset="50%"  stopColor="#186842" stopOpacity="1"/>
          <stop offset="100%" stopColor="#28b062" stopOpacity="1"/>
        </linearGradient>
        <linearGradient id="jgRivShine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(120,240,180,0)" />
          <stop offset="40%"  stopColor="rgba(120,240,180,0.14)"/>
          <stop offset="60%"  stopColor="rgba(180,255,220,0.22)"/>
          <stop offset="100%" stopColor="rgba(120,240,180,0)" />
        </linearGradient>
      </defs>
      {/* Bank shadows */}
      <path d="M415,0 C448,130 446,295 374,415 C336,478 344,544 362,600"
        fill="none" stroke="#061008" strokeWidth="18" opacity="0.82"/>
      <path d="M468,0 C548,130 564,295 530,415 C508,478 488,544 474,600"
        fill="none" stroke="#061008" strokeWidth="18" opacity="0.82"/>
      {/* River fill */}
      <path d="M415,0 C448,130 446,295 374,415 C336,478 344,544 362,600
               L474,600 C488,544 508,478 530,415 C564,295 548,130 468,0 Z"
        fill="url(#jgRivG)"/>
      {/* Surface shine */}
      <path d="M415,0 C448,130 446,295 374,415 C336,478 344,544 362,600
               L474,600 C488,544 508,478 530,415 C564,295 548,130 468,0 Z"
        fill="url(#jgRivShine)"/>
      {/* Animated ripples */}
      <g clipPath="url(#jgRivClip)">
        {ripples.map(({id, delay, dur})=>(
          <line key={id} x1="430" y1="0" x2="452" y2="0"
            stroke="rgba(100,230,160,0)" strokeWidth="1.8">
            <animate attributeName="stroke-opacity"
              values="0;0.70;0.54;0" keyTimes="0;0.08;0.82;1"
              dur={dur} begin={delay} repeatCount="indefinite"/>
            <animate attributeName="strokeWidth"
              from="1" to="8"
              dur={dur} begin={delay} repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="translate"
              from="0,0" to="-46,600"
              dur={dur} begin={delay} repeatCount="indefinite"/>
          </line>
        ))}
      </g>
      {/* Calm glints */}
      {[[428,540],[418,418],[425,298],[432,178],[420,72]].map(([x,y],i)=>(
        <ellipse key={i} cx={x} cy={y} rx={4+i*2} ry={1.5+i}
          fill="rgba(140,255,190,0.15)" transform={`rotate(-12,${x},${y})`}/>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ARCHED BRIDGE — dramatic vault spanning the clearing
//
//  Full-screen SVG overlay, viewBox 0 0 1000 1000,
//  preserveAspectRatio="none" → coords are % of arena size.
//  Arch ~280px on a ~475px arena (user's screen).
// ═══════════════════════════════════════════════════════════════
function ArchBridge() {
  /* Bridge sits near the horizon (background feel).
     Anchors at y=510 (51% down — just below the sky/ground split).
     ctrl_y=270 → arch = 0.75*(510-270) = 180 vb ≈ 86px — modest background arch. */
  const P = [
    { x: 350, y: 510 },   // left anchor  (background, near horizon)
    { x: 430, y: 270  },  // control 1
    { x: 570, y: 270  },  // control 2
    { x: 650, y: 510 },   // right anchor
  ];

  const cubic = (t) => {
    const u = 1 - t;
    return {
      x: u*u*u*P[0].x + 3*u*u*t*P[1].x + 3*u*t*t*P[2].x + t*t*t*P[3].x,
      y: u*u*u*P[0].y + 3*u*u*t*P[1].y + 3*u*t*t*P[2].y + t*t*t*P[3].y,
    };
  };

  const NPLANKS = 42;
  const deckD = `M${P[0].x},${P[0].y} C${P[1].x},${P[1].y} ${P[2].x},${P[2].y} ${P[3].x},${P[3].y}`;

  const railH = 22;
  const railD1 = `M${P[0].x},${P[0].y-railH}   C${P[1].x},${P[1].y-railH}   ${P[2].x},${P[2].y-railH}   ${P[3].x},${P[3].y-railH}`;
  const railD2 = `M${P[0].x},${P[0].y-railH*2} C${P[1].x},${P[1].y-railH*2} ${P[2].x},${P[2].y-railH*2} ${P[3].x},${P[3].y-railH*2}`;

  return (
    <svg style={{
      position:'absolute', top:0, left:0, width:'100%', height:'100%',
      zIndex:5, pointerEvents:'none',
    }} viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="jgBrRope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#7a5828"/>
          <stop offset="100%" stopColor="#4a3010"/>
        </linearGradient>
      </defs>

      {/* No support pillars — clean bridge look */}

      {/* Deck rope shadow */}
      <path d={deckD} fill="none" stroke="#0a0400" strokeWidth="7" opacity="0.18"/>
      {/* Main deck rope */}
      <path d={deckD} fill="none" stroke="url(#jgBrRope)" strokeWidth="5" strokeLinecap="round"/>
      {/* Deck highlight */}
      <path d={deckD} fill="none" stroke="rgba(180,140,70,0.15)" strokeWidth="2"/>

      {/* Side railings (thinner — distant feel) */}
      <path d={railD1} fill="none" stroke="url(#jgBrRope)" strokeWidth="3.5" strokeLinecap="round" opacity="0.72"/>
      <path d={railD2} fill="none" stroke="url(#jgBrRope)" strokeWidth="2.5" strokeLinecap="round" opacity="0.52"/>

      {/* Planks + vertical ropes */}
      {Array.from({length: NPLANKS}, (_, i) => {
        const t = (i + 0.5) / NPLANKS;
        const p = cubic(t);
        const col = i % 2 === 0 ? '#9a6020' : '#7a4818';
        const pw = 34; // plank width in vb-x units
        return (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - railH * 2}
              stroke="#4a3018" strokeWidth="1.5" opacity="0.50"/>
            <rect x={p.x - pw/2} y={p.y - 3} width={pw} height={6}
              fill={col} rx="1"/>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FULL JUNGLE DECORATIONS
// ═══════════════════════════════════════════════════════════════
export function JungleDecorations() {

  const fireflies = Array.from({length:16},(_,i)=>({
    left:  `${5+((i*6.7+i*i*0.8)%86)}%`,
    top:   `${12+((i*8.2+i*3.1)%72)}%`,
    delay: `${((i*0.58)%4).toFixed(2)}s`,
    dur:   `${2.0+(i%5)*0.5}s`,
    size:  `${3+i%3}px`,
    hue:   i%3===0 ? '#d4ff60' : i%3===1 ? '#a0ff80' : '#60ffb0',
  }));

  const pos = { position:'absolute', pointerEvents:'none' };

  return (
    <>
      {/* ══ z-1 — Subtle sky atmosphere tint ══ */}
      <div style={{
        ...pos, top:0, left:0, right:0, height:'45%', zIndex:1,
        background:`
          radial-gradient(ellipse 30% 40% at  0% 0%, rgba(14,52,130,0.10) 0%, transparent 65%),
          radial-gradient(ellipse 30% 40% at 100% 0%, rgba(14,52,130,0.10) 0%, transparent 65%)`,
      }}/>

      {/*
        ╔══════════════════════════════════════════════════════════╗
        ║  TREE Z-INDEX STRATEGY                                   ║
        ║  z=2  deep background trees  (behind bridge z=5)        ║
        ║  z=3  mid-ground trees       (behind bridge z=5)        ║
        ║  z=5  BRIDGE                                             ║
        ║  z=6  foreground trees       (IN FRONT of bridge)       ║
        ║  z=8  animals                                            ║
        ║  z=10 bases                  (always top of vegetation)  ║
        ╚══════════════════════════════════════════════════════════╝
        Bridge anchors are at ~34% and ~66% of screen width.
        Trees at 28–37% and 63–72% at z=6 cover those anchor points
        so the bridge appears to disappear INTO the jungle. */}

      {/* ════════════════════════════════════════════════════════════
          JUNGLE BACKGROUND LAYERS — ALL at z=5 (in front of river z=4)
          Left bank: 0–32%  |  CENTER CLEAR: 33–67%  |  Right bank: 68–100%
          4 rows of increasing height fill the sky with canopy.
          ════════════════════════════════════════════════════════════ */}

      {/* ── ROW A: Ultra-deep sky canopies — very tall, reach into sky (bottom:38%, h:55-70%) ── */}
      <BroadTree  style={{ ...pos, left:'-4%',  bottom:'38%', width:'12%', height:'68%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, left:'3%',   bottom:'39%', width:'10%', height:'62%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, left:'9%',   bottom:'38%', width:'12%', height:'60%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, left:'15%',  bottom:'39%', width:'9%',  height:'56%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, left:'21%',  bottom:'38%', width:'11%', height:'52%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, left:'27%',  bottom:'39%', width:'8%',  height:'48%', zIndex:5 }}/>
      {/* CENTER CLEAR */}
      <TallTree   style={{ ...pos, right:'27%', bottom:'39%', width:'8%',  height:'48%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, right:'21%', bottom:'38%', width:'11%', height:'52%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, right:'15%', bottom:'39%', width:'9%',  height:'56%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, right:'9%',  bottom:'38%', width:'12%', height:'60%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, right:'3%',  bottom:'39%', width:'10%', height:'62%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, right:'-4%', bottom:'38%', width:'12%', height:'68%', zIndex:5 }} flip/>

      {/* ── ROW B: Deep background — (bottom:33%, h:38-50%) ── */}
      <JunglePalm style={{ ...pos, left:'0%',   bottom:'33%', width:'9%',  height:'50%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, left:'6%',   bottom:'34%', width:'11%', height:'46%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, left:'12%',  bottom:'33%', width:'8%',  height:'42%', zIndex:5 }}/>
      <JunglePalm style={{ ...pos, left:'17%',  bottom:'34%', width:'8%',  height:'40%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, left:'22%',  bottom:'33%', width:'10%', height:'38%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, left:'28%',  bottom:'34%', width:'7%',  height:'36%', zIndex:5 }} flip/>
      {/* CENTER CLEAR */}
      <TallTree   style={{ ...pos, right:'28%', bottom:'34%', width:'7%',  height:'36%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, right:'22%', bottom:'33%', width:'10%', height:'38%', zIndex:5 }} flip/>
      <JunglePalm style={{ ...pos, right:'17%', bottom:'34%', width:'8%',  height:'40%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, right:'12%', bottom:'33%', width:'8%',  height:'42%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, right:'6%',  bottom:'34%', width:'11%', height:'46%', zIndex:5 }}/>
      <JunglePalm style={{ ...pos, right:'0%',  bottom:'33%', width:'9%',  height:'50%', zIndex:5 }} flip/>

      {/* ── ROW C: Mid-background — (bottom:27%, h:28-36%) ── */}
      <BroadTree  style={{ ...pos, left:'1%',   bottom:'28%', width:'10%', height:'36%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, left:'7%',   bottom:'27%', width:'7%',  height:'32%', zIndex:5 }} flip/>
      <JunglePalm style={{ ...pos, left:'13%',  bottom:'28%', width:'8%',  height:'30%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, left:'19%',  bottom:'27%', width:'9%',  height:'28%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, left:'25%',  bottom:'28%', width:'7%',  height:'26%', zIndex:5 }}/>
      {/* CENTER CLEAR */}
      <TallTree   style={{ ...pos, right:'25%', bottom:'28%', width:'7%',  height:'26%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, right:'19%', bottom:'27%', width:'9%',  height:'28%', zIndex:5 }}/>
      <JunglePalm style={{ ...pos, right:'13%', bottom:'28%', width:'8%',  height:'30%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, right:'7%',  bottom:'27%', width:'7%',  height:'32%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, right:'1%',  bottom:'28%', width:'10%', height:'36%', zIndex:5 }} flip/>

      {/* ── ROW D: Near-background — (bottom:20%, h:20-28%) ── */}
      <TallTree   style={{ ...pos, left:'0%',   bottom:'21%', width:'8%',  height:'28%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, left:'5%',   bottom:'20%', width:'10%', height:'26%', zIndex:5 }}/>
      <JunglePalm style={{ ...pos, left:'11%',  bottom:'21%', width:'7%',  height:'24%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, left:'16%',  bottom:'20%', width:'8%',  height:'22%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, left:'22%',  bottom:'21%', width:'8%',  height:'20%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, left:'27%',  bottom:'20%', width:'6%',  height:'18%', zIndex:5 }}/>
      {/* CENTER CLEAR */}
      <TallTree   style={{ ...pos, right:'27%', bottom:'20%', width:'6%',  height:'18%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, right:'22%', bottom:'21%', width:'8%',  height:'20%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, right:'16%', bottom:'20%', width:'8%',  height:'22%', zIndex:5 }} flip/>
      <JunglePalm style={{ ...pos, right:'11%', bottom:'21%', width:'7%',  height:'24%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, right:'5%',  bottom:'20%', width:'10%', height:'26%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, right:'0%',  bottom:'21%', width:'8%',  height:'28%', zIndex:5 }}/>

      {/* ══ CLOUDS — z=2 (BEHIND all trees z=5+, sky visible through canopy gaps) ══ */}
      <Cloud      style={{ ...pos, top:'2%',  left:'4%',   width:'20%', zIndex:2 }}             tint="white" className="jg-cl1"/>
      <SmallCloud style={{ ...pos, top:'10%', left:'16%',  width:'12%', zIndex:2, opacity:0.75}} tint="grey"  className="jg-cl2"/>
      <Cloud      style={{ ...pos, top:'3%',  left:'29%',  width:'22%', zIndex:2 }}             tint="dark"  className="jg-cl3"/>
      <SmallCloud style={{ ...pos, top:'9%',  left:'47%',  width:'13%', zIndex:2, opacity:0.68}} tint="grey"  className="jg-cl4"/>
      <Cloud      style={{ ...pos, top:'4%',  right:'24%', width:'19%', zIndex:2, opacity:0.90}} tint="white" className="jg-cl5"/>
      <Cloud      style={{ ...pos, top:'13%', right:'6%',  width:'21%', zIndex:2 }}             tint="dark"  className="jg-cl6"/>
      <SmallCloud style={{ ...pos, top:'7%',  right:'40%', width:'13%', zIndex:2, opacity:0.72}} tint="grey"  className="jg-cl7"/>
      <Cloud      style={{ ...pos, top:'17%', left:'20%',  width:'24%', zIndex:2, opacity:0.50}} tint="dark"  className="jg-cl8"/>
      <SmallCloud style={{ ...pos, top:'1%',  right:'12%', width:'10%', zIndex:2, opacity:0.80}} tint="white" className="jg-cl1"/>

      {/* ══ z-4 — Ground mist ══ */}
      <div style={{
        ...pos, bottom:'36%', left:0, right:0, height:'6%', zIndex:4,
        background:'linear-gradient(to top,rgba(28,72,10,0.28),rgba(50,110,16,0.08),transparent)',
        filter:'blur(12px)',
      }} className="jg-mist"/>

      {/* ══ z-4 — RIVER ══ */}
      <FlowingRiver/>

      {/* ══ z-5 — ARCHED BRIDGE ══ */}
      <ArchBridge/>

      {/* ──────────────────────────────────────────────────────────
          EXTRA deep-background row — sides only, NO river zone
          ────────────────────────────────────────────────────────── */}
      <TallTree   style={{ ...pos, left:'5%',   bottom:'25%', width:'6%', height:'20%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, left:'11%',  bottom:'24%', width:'7%', height:'18%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, left:'19%',  bottom:'25%', width:'6%', height:'16%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, left:'26%',  bottom:'24%', width:'7%', height:'15%', zIndex:5 }} flip/>
      {/* left:39% and left:56% REMOVED — were inside river zone */}
      <TallTree   style={{ ...pos, left:'63%',  bottom:'25%', width:'5%', height:'16%', zIndex:5 }} flip/>
      <BroadTree  style={{ ...pos, left:'70%',  bottom:'24%', width:'7%', height:'15%', zIndex:5 }}/>
      <TallTree   style={{ ...pos, left:'76%',  bottom:'25%', width:'6%', height:'16%', zIndex:5 }}/>
      <BroadTree  style={{ ...pos, left:'83%',  bottom:'24%', width:'7%', height:'18%', zIndex:5 }} flip/>
      <TallTree   style={{ ...pos, left:'90%',  bottom:'25%', width:'6%', height:'20%', zIndex:5 }}/>

      {/* ──────────────────────────────────────────────────────────
          RIVERSIDE VEGETATION — small trees on both banks, z=6
          Left bank:  left:28–33%  (just before river at 35%)
          Right bank: left:67–72%  (just after river at 65%)
          All small sizes to look like waterside shrubs/palms.
          ────────────────────────────────────────────────────────── */}
      {/* ▸ LEFT BANK */}
      <JunglePalm style={{ ...pos, left:'28%', bottom:'38%', width:'4%', height:'16%', zIndex:6 }}/>
      <TallTree   style={{ ...pos, left:'30%', bottom:'36%', width:'3.5%', height:'14%', zIndex:6 }} flip/>
      <JunglePalm style={{ ...pos, left:'29%', bottom:'40%', width:'3%', height:'12%', zIndex:6 }} flip/>
      <TallTree   style={{ ...pos, left:'31%', bottom:'42%', width:'3.5%', height:'13%', zIndex:6 }}/>
      <JunglePalm style={{ ...pos, left:'32%', bottom:'37%', width:'3%', height:'11%', zIndex:6 }}/>
      <BroadTree  style={{ ...pos, left:'33%', bottom:'39%', width:'4%', height:'14%', zIndex:6 }} flip/>
      <TallTree   style={{ ...pos, left:'30%', bottom:'44%', width:'3%', height:'10%', zIndex:6 }}/>
      <JunglePalm style={{ ...pos, left:'32%', bottom:'46%', width:'3.5%', height:'10%', zIndex:6 }} flip/>

      {/* ▸ RIGHT BANK */}
      <JunglePalm style={{ ...pos, right:'28%', bottom:'38%', width:'4%', height:'16%', zIndex:6 }} flip/>
      <TallTree   style={{ ...pos, right:'30%', bottom:'36%', width:'3.5%', height:'14%', zIndex:6 }}/>
      <JunglePalm style={{ ...pos, right:'29%', bottom:'40%', width:'3%', height:'12%', zIndex:6 }}/>
      <TallTree   style={{ ...pos, right:'31%', bottom:'42%', width:'3.5%', height:'13%', zIndex:6 }} flip/>
      <JunglePalm style={{ ...pos, right:'32%', bottom:'37%', width:'3%', height:'11%', zIndex:6 }} flip/>
      <BroadTree  style={{ ...pos, right:'33%', bottom:'39%', width:'4%', height:'14%', zIndex:6 }}/>
      <TallTree   style={{ ...pos, right:'30%', bottom:'44%', width:'3%', height:'10%', zIndex:6 }} flip/>
      <JunglePalm style={{ ...pos, right:'32%', bottom:'46%', width:'3.5%', height:'10%', zIndex:6 }}/>

      {/* ──────────────────────────────────────────────────────────
          z=6  FOREGROUND trees.
          Left side: stop at left:27% — no trees entering river zone (35-65%).
          Right side: stop at right:27% — same.
          Trunks won't appear in the river.
          ────────────────────────────────────────────────────────── */}

      {/* ════════════════════════════════════════════════════════════
          z=7  FOREGROUND JUNGLE WALLS
          Left bank: 0–32% | River clear: 33–67% | Right bank: 68–100%
          3 layers of overlapping trees packed together like real jungle.
          ════════════════════════════════════════════════════════════ */}

      {/* ▓▓ LEFT BANK — dense jungle wall ▓▓ */}
      {/* Far-left anchor trees (tallest, overflow off-screen) */}
      <BroadTree  style={{ ...pos, left:'-8%',  bottom:'14%', width:'26%', height:'92%', zIndex:7 }}/>
      <TallTree   style={{ ...pos, left:'-2%',  bottom:'14%', width:'16%', height:'78%', zIndex:7 }}/>
      <BroadTree  style={{ ...pos, left:'4%',   bottom:'14%', width:'20%', height:'72%', zIndex:7 }} flip/>
      <TallTree   style={{ ...pos, left:'8%',   bottom:'14%', width:'14%', height:'64%', zIndex:7 }}/>
      <JunglePalm style={{ ...pos, left:'12%',  bottom:'14%', width:'14%', height:'60%', zIndex:7 }}/>
      <BroadTree  style={{ ...pos, left:'16%',  bottom:'14%', width:'16%', height:'56%', zIndex:7 }}/>
      <TallTree   style={{ ...pos, left:'20%',  bottom:'14%', width:'12%', height:'52%', zIndex:7 }} flip/>
      <JunglePalm style={{ ...pos, left:'24%',  bottom:'14%', width:'11%', height:'48%', zIndex:7 }} flip/>
      <BroadTree  style={{ ...pos, left:'26%',  bottom:'14%', width:'14%', height:'44%', zIndex:7 }}/>
      <TallTree   style={{ ...pos, left:'30%',  bottom:'14%', width:'10%', height:'40%', zIndex:7 }}/>
      {/* Second row — slightly different positions for organic feel */}
      <TallTree   style={{ ...pos, left:'1%',   bottom:'18%', width:'11%', height:'58%', zIndex:7 }} flip/>
      <BroadTree  style={{ ...pos, left:'6%',   bottom:'16%', width:'15%', height:'52%', zIndex:7 }}/>
      <JunglePalm style={{ ...pos, left:'14%',  bottom:'18%', width:'10%', height:'46%', zIndex:7 }} flip/>
      <TallTree   style={{ ...pos, left:'19%',  bottom:'16%', width:'12%', height:'44%', zIndex:7 }}/>
      <BroadTree  style={{ ...pos, left:'22%',  bottom:'18%', width:'13%', height:'38%', zIndex:7 }} flip/>
      <TallTree   style={{ ...pos, left:'28%',  bottom:'16%', width:'9%',  height:'36%', zIndex:7 }} flip/>

      {/* ▓▓ RIGHT BANK — dense jungle wall (mirrored) ▓▓ */}
      {/* Far-right anchor trees */}
      <BroadTree  style={{ ...pos, right:'-8%',  bottom:'14%', width:'26%', height:'92%', zIndex:7 }} flip/>
      <TallTree   style={{ ...pos, right:'-2%',  bottom:'14%', width:'16%', height:'78%', zIndex:7 }} flip/>
      <BroadTree  style={{ ...pos, right:'4%',   bottom:'14%', width:'20%', height:'72%', zIndex:7 }}/>
      <TallTree   style={{ ...pos, right:'8%',   bottom:'14%', width:'14%', height:'64%', zIndex:7 }} flip/>
      <JunglePalm style={{ ...pos, right:'12%',  bottom:'14%', width:'14%', height:'60%', zIndex:7 }} flip/>
      <BroadTree  style={{ ...pos, right:'16%',  bottom:'14%', width:'16%', height:'56%', zIndex:7 }} flip/>
      <TallTree   style={{ ...pos, right:'20%',  bottom:'14%', width:'12%', height:'52%', zIndex:7 }}/>
      <JunglePalm style={{ ...pos, right:'24%',  bottom:'14%', width:'11%', height:'48%', zIndex:7 }}/>
      <BroadTree  style={{ ...pos, right:'26%',  bottom:'14%', width:'14%', height:'44%', zIndex:7 }} flip/>
      <TallTree   style={{ ...pos, right:'30%',  bottom:'14%', width:'10%', height:'40%', zIndex:7 }} flip/>
      {/* Second row right */}
      <TallTree   style={{ ...pos, right:'1%',   bottom:'18%', width:'11%', height:'58%', zIndex:7 }}/>
      <BroadTree  style={{ ...pos, right:'6%',   bottom:'16%', width:'15%', height:'52%', zIndex:7 }} flip/>
      <JunglePalm style={{ ...pos, right:'14%',  bottom:'18%', width:'10%', height:'46%', zIndex:7 }}/>
      <TallTree   style={{ ...pos, right:'19%',  bottom:'16%', width:'12%', height:'44%', zIndex:7 }} flip/>
      <BroadTree  style={{ ...pos, right:'22%',  bottom:'18%', width:'13%', height:'38%', zIndex:7 }}/>
      <TallTree   style={{ ...pos, right:'28%',  bottom:'16%', width:'9%',  height:'36%', zIndex:7 }}/>

      {/* ──────────────────────────────────────────────────────────
          ANIMALS — precise placement based on bridge viewBox coords
          Bridge viewBox 0 0 1000 1000, preserveAspectRatio:none
          → center arch peak: x=500,y=270  → top:27%, left:50%
          → left anchor:      x=350,y=510  → top:51%, left:35%
          ────────────────────────────────────────────────────────── */}

      {/* 🐒 MONKEY (redesigned) — between antenna and inner pillar of LEFT base */}
      <SittingMonkey style={{ ...pos, bottom:'36%', left:'17%', width:'6%', zIndex:11 }}/>

      {/* 🐍 SNAKE — at river bank left side */}
      <BranchSnake   style={{ ...pos, top:'49%', left:'34%', width:'5%', height:'16%', zIndex:9 }}/>

      {/* 🦜 PARROT — on the outer/right pillar of the right base, slightly higher */}
      <Parrot        style={{ ...pos, bottom:'40%', right:'22%', width:'5%', zIndex:11 }}/>

      {/* ══ z-1 — BIRD FLOCKS — behind all trees (z=2+)
           so birds disappear completely when flying through the jungle ══ */}
      <BirdFlock
        style={{ ...pos, top:' 5%', left:0, width:'13%', zIndex:1 }}
        flockClass="jg-flock1"
      />
      <BirdFlock
        style={{ ...pos, top:'11%', left:0, width:'11%', zIndex:1 }}
        flockClass="jg-flock2"
      />
      <BirdFlock
        style={{ ...pos, top:'17%', left:0, width:' 9%', zIndex:1 }}
        flockClass="jg-flock3"
      />

      {/* ══ z-12 — FIREFLIES ══ */}
      {fireflies.map((ff,i)=>(
        <div key={i} style={{
          ...pos,
          left:ff.left, top:ff.top,
          width:ff.size, height:ff.size, borderRadius:'50%',
          background:`radial-gradient(circle,${ff.hue} 0%,rgba(100,200,60,0.6) 55%,transparent 100%)`,
          boxShadow:`0 0 6px 3px rgba(140,220,50,0.50)`,
          zIndex:12,
          animationName:'jg-firefly', animationDuration:ff.dur,
          animationTimingFunction:'ease-in-out', animationIterationCount:'infinite',
          animationDelay:ff.delay,
        }}/>
      ))}
    </>
  );
}


