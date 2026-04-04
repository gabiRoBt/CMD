export function BaseWasteland() {
  return (
    <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <linearGradient id="wlTower" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#3e2412"/>
          <stop offset="100%" stopColor="#1e1006"/>
        </linearGradient>
        <linearGradient id="wlFire" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#ff6600"/>
          <stop offset="60%"  stopColor="#ff3300" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#ffaa00" stopOpacity="0"/>
        </linearGradient>
        <filter id="wlShadow">
          <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="#1a0800" floodOpacity="0.7"/>
        </filter>
        <pattern id="brickPat" x="0" y="0" width="20" height="12" patternUnits="userSpaceOnUse">
          <rect width="20" height="12" fill="#3a2010"/>
          <rect x="1"  y="1" width="8" height="5" fill="#422312" rx="0.3"/>
          <rect x="11" y="1" width="8" height="5" fill="#3e1f0e" rx="0.3"/>
          <rect x="5"  y="7" width="9" height="4" fill="#402010" rx="0.3"/>
          <rect x="1"  y="7" width="3" height="4" fill="#3c1e0c" rx="0.3"/>
          <rect x="16" y="7" width="3" height="4" fill="#3c1e0c" rx="0.3"/>
        </pattern>
      </defs>

      <rect x="0" y="148" width="200" height="32" fill="#1e1005"/>
      {[15,40,80,120,165,185].map((x,i) => (
        <ellipse key={i} cx={x} cy={148} rx={7+i%3*3} ry="4" fill="#2a1608" opacity="0.9"/>
      ))}

      <polygon points="20,148 16,42 55,38 60,54 84,51 90,36 110,36 115,51 139,54 145,38 184,42 180,148"
               fill="url(#brickPat)" filter="url(#wlShadow)"/>
      <polygon points="20,148 16,42 55,38 60,54 84,51 90,36 110,36 115,51 139,54 145,38 184,42 180,148"
               fill="none" stroke="#5a3018" strokeWidth="1.5" opacity="0.6"/>

      <path d="M80 70 L85 90 L78 110" fill="none" stroke="#1a0a04" strokeWidth="2.5" opacity="0.7"/>
      <path d="M120 60 L115 85"       fill="none" stroke="#1a0a04" strokeWidth="2"   opacity="0.5"/>
      <polygon points="145,38 180,148 155,148 150,90" fill="#251208" opacity="0.9"/>

      <rect x="8" y="32" width="38" height="118" fill="url(#wlTower)" stroke="#5a3018" strokeWidth="1.5" filter="url(#wlShadow)"/>
      {[50,64,78,92,106,120,134].map((y,i) => (
        <line key={i} x1="8" y1={y} x2="46" y2={y} stroke="#1a0804" strokeWidth="1" opacity="0.4"/>
      ))}
      {[8,18,28,36].map((x,i) => (
        <rect key={i} x={x} y="20" width="8" height="14" fill="#3a1e0a"/>
      ))}
      <line x1="8"  y1="96" x2="46" y2="96" stroke="#6b3318" strokeWidth="2"/>
      <line x1="8"  y1="72" x2="46" y2="72" stroke="#6b3318" strokeWidth="2"/>
      <line x1="14" y1="32" x2="28" y2="72" stroke="#6b3318" strokeWidth="1.5" opacity="0.7"/>
      <line x1="40" y1="32" x2="28" y2="72" stroke="#6b3318" strokeWidth="1.5" opacity="0.7"/>
      <rect x="16" y="48" width="18" height="14" fill="#180804" rx="1"/>
      <line x1="16" y1="48" x2="34" y2="62" stroke="#0a0402" strokeWidth="2"/>
      <line x1="34" y1="48" x2="16" y2="62" stroke="#0a0402" strokeWidth="1.5"/>
      <rect x="16" y="76" width="18" height="13" fill="#180804" rx="1"/>
      <rect x="62" y="62" width="24" height="20" fill="#180804" rx="1"/>
      <rect x="64" y="64" width="20" height="16" fill="#ff8020" opacity="0.18" rx="1"/>
      <rect x="108" y="62" width="22" height="20" fill="#180804" rx="1"/>
      <line x1="8"  y1="36" x2="56" y2="36" stroke="#8a5a28" strokeWidth="1.2"/>
      {[12,20,28,36,44,52].map((x,i) => (
        <polygon key={i} points={`${x},36 ${x+3},32 ${x+6},36`} fill="none" stroke="#8a5a28" strokeWidth="0.9"/>
      ))}
      <line x1="56"  y1="36" x2="184" y2="46" stroke="#8a5a28" strokeWidth="1.2" opacity="0.7"/>
      <path d="M80 148 L80 108 Q100 92 120 108 L120 148" fill="#180804"/>
      <path d="M80 108 Q100 92 120 108" fill="none" stroke="#6b3318" strokeWidth="2"/>
      <ellipse cx="100" cy="132" rx="12" ry="8" fill="#ff6600" opacity="0.2"/>
      <ellipse cx="100" cy="128" rx="8"  ry="5" fill="#ff8800" opacity="0.15"/>
      <ellipse cx="27"  cy="22"  rx="8"  ry="4" fill="url(#wlFire)" opacity="0.8"/>
      <ellipse cx="27"  cy="20"  rx="5"  ry="3" fill="url(#wlFire)" opacity="0.6"/>
      <polygon points="27,48 29,42 31,48 25,44 33,44" fill="#d4a843" opacity="0.85"/>
      <polygon points="144,38 160,24 162,38" fill="#3a2010"/>

      {/* Antenna — attachment at (100,20) */}
      <line x1="100" y1="38" x2="100" y2="20" stroke="#8a5a28" strokeWidth="1.5"/>
      <line x1="94"  y1="26" x2="106" y2="26" stroke="#8a5a28" strokeWidth="1"/>
      <line x1="92"  y1="22" x2="94"  y2="26" stroke="#8a5a28" strokeWidth="0.8"/>
      <line x1="108" y1="22" x2="106" y2="26" stroke="#8a5a28" strokeWidth="0.8"/>
      {[[60,142],[90,145],[130,144],[150,143]].map(([x,y],i) => (
        <polygon key={i} points={`${x},${y} ${x+6},${y-4} ${x+12},${y}`} fill="#2a1508" opacity="0.8"/>
      ))}
    </svg>
  );
}

const DEAD_TREES = [
  { side: 'left',  pos: '25%', w: '5.5%', flip: false },
  { side: 'left',  pos: '34%', w: '3.8%', flip: true  },
  { side: 'right', pos: '26%', w: '4.5%', flip: false  },
  { side: 'right', pos: '37%', w: '3.2%', flip: true  },
];

function DeadTree({ style }) {
  return (
    <svg style={style} viewBox="0 0 50 100" xmlns="http://www.w3.org/2000/svg">
      <line x1="25" y1="100" x2="25" y2="20" stroke="#3a1a08" strokeWidth="4"/>
      <line x1="25" y1="35"  x2="8"  y2="18" stroke="#3a1a08" strokeWidth="2.5"/>
      <line x1="25" y1="45"  x2="42" y2="28" stroke="#3a1a08" strokeWidth="2.5"/>
      <line x1="25" y1="55"  x2="5"  y2="48" stroke="#3a1a08" strokeWidth="2"/>
      <line x1="25" y1="62"  x2="45" y2="52" stroke="#3a1a08" strokeWidth="2"/>
      <line x1="8"  y1="18"  x2="3"  y2="10" stroke="#3a1a08" strokeWidth="1.5"/>
      <line x1="8"  y1="18"  x2="14" y2="8"  stroke="#3a1a08" strokeWidth="1.5"/>
    </svg>
  );
}

export function WastelandDecorations() {
  return (
    <>
      {DEAD_TREES.map((tr, i) => (
        <DeadTree key={i} style={{
          position: 'absolute', bottom: '37%',
          [tr.side]: tr.pos,
          width: tr.w, zIndex: 6, pointerEvents: 'none',
          transform: tr.flip ? 'scaleX(-1)' : undefined,
        }}/>
      ))}
      <svg style={{ position:'absolute', bottom:'38%', left:'47%', width:'4%', zIndex:7, pointerEvents:'none' }}
           viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="28" width="24" height="30" fill="#2a1008" rx="2"/>
        <rect x="6" y="30" width="28" height="4"  fill="#3a1808" rx="1"/>
        <rect x="6" y="40" width="28" height="4"  fill="#3a1808" rx="1"/>
        <rect x="6" y="50" width="28" height="4"  fill="#3a1808" rx="1"/>
        <path d="M20,28 Q14,18 18,10 Q22,18 20,12 Q28,18 24,10 Q26,20 20,28" fill="#ff6600" opacity="0.9" className="wl-fire"/>
        <path d="M20,28 Q16,22 19,16 Q22,22 20,18 Q25,22 22,16 Q24,23 20,28" fill="#ffaa00" opacity="0.8" className="wl-fire"/>
      </svg>
      <div style={{
        position:'absolute', bottom:'35%', left:0, right:0, height:'8%',
        zIndex:5, pointerEvents:'none',
        background:'linear-gradient(to top, rgba(90,50,20,.25), transparent)',
      }}/>
    </>
  );
}
