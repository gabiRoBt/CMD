export function BaseSiberia() {
  return (
    <svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <linearGradient id="siArch" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#2e5880"/>
          <stop offset="50%"  stopColor="#1a3a5a"/>
          <stop offset="100%" stopColor="#0f2035"/>
        </linearGradient>
        <linearGradient id="siSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a4a6a"/>
          <stop offset="40%"  stopColor="#1e3a56"/>
          <stop offset="100%" stopColor="#0f2035"/>
        </linearGradient>
        <linearGradient id="siSnow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#eef6ff" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#cce0f5" stopOpacity="0.6"/>
        </linearGradient>
        <radialGradient id="siWindow" cx="50%" cy="40%">
          <stop offset="0%"   stopColor="#88ccee" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#224466" stopOpacity="0.1"/>
        </radialGradient>
        <filter id="siShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5"/>
        </filter>
      </defs>

      <rect x="5"   y="138" width="210" height="22" fill="#0b1a2b" rx="1"/>
      <rect x="5"   y="136" width="210" height="4"  fill="#0e2236"/>
      <path d="M15,138 L15,72 Q15,28 110,28 Q205,28 205,72 L205,138 Z" fill="url(#siArch)" filter="url(#siShadow)"/>

      {Array.from({ length: 15 }, (_, i) => {
        const x = 18 + i * 13;
        return <line key={i} x1={x} y1={Math.max(28, 72 - Math.abs(i - 7) * 8)} x2={x} y2="138" stroke="#0a1f35" strokeWidth="1.2" opacity="0.7"/>;
      })}
      {[55, 72, 90, 108, 122, 135].map((y, i) => (
        <line key={i} x1="15" y1={y} x2="205" y2={y} stroke="#1a3555" strokeWidth="0.9" opacity="0.6"/>
      ))}

      <path d="M18,138 L18,74 Q18,34 110,34 Q202,34 202,74 L202,138" fill="none" stroke="#3a6a9a" strokeWidth="1.5" opacity="0.5"/>
      <path d="M15,40 Q50,30 110,28 Q170,30 205,40 L205,50 Q170,38 110,36 Q50,38 15,50 Z" fill="url(#siSnow)" opacity="0.9"/>
      <path d="M15,40 Q50,32 110,30 Q170,32 205,40" fill="none" stroke="#e0f0ff" strokeWidth="1.5" opacity="0.7"/>
      {[30, 48, 65, 82, 100, 120, 138, 155, 175, 192].map((x, i) => (
        <polygon key={i} points={`${x},40 ${x+3},${40+(4+(i%3)*5)} ${x+6},40`} fill="#ddeeff" opacity={0.7 - i%2*0.2}/>
      ))}

      <rect x="58"  y="94"  width="46" height="44" fill="#0e2035" rx="1"/>
      <rect x="106" y="94"  width="46" height="44" fill="#0c1c2d" rx="1"/>
      <line x1="104" y1="94" x2="104" y2="138" stroke="#2a5a8a" strokeWidth="2.5"/>
      {[100, 108, 116, 124, 130].map((y, i) => (
        <g key={i}>
          <line x1="58"  y1={y} x2="104" y2={y} stroke="#14293f" strokeWidth="0.8"/>
          <line x1="106" y1={y} x2="152" y2={y} stroke="#12253b" strokeWidth="0.8"/>
        </g>
      ))}
      <rect x="96"  y="114" width="8" height="5" fill="#2a5a8a" rx="1"/>
      <rect x="110" y="114" width="8" height="5" fill="#2a5a8a" rx="1"/>
      {[0, 1, 2].map(i => (
        <g key={i} opacity="0.3">
          <rect x={62  + i*12} y="136" width="6" height="2" fill="#ffb300"/>
          <rect x={112 + i*12} y="136" width="6" height="2" fill="#ffb300"/>
        </g>
      ))}

      <rect x="15" y="52" width="32" height="88" fill="url(#siSteel)"/>
      <rect x="10" y="44" width="42" height="12" fill="#0f2035"/>
      <rect x="12" y="46" width="38" height="9"  fill="#1a3a5a"/>
      <rect x="20" y="60" width="20" height="14" fill="#0a1828" rx="1"/>
      <rect x="21" y="61" width="18" height="12" fill="url(#siWindow)" rx="1"/>
      <line x1="30" y1="61" x2="30" y2="73" stroke="#1a3a5a" strokeWidth="1"/>
      <line x1="21" y1="67" x2="39" y2="67" stroke="#1a3a5a" strokeWidth="1"/>
      {[[17,55],[17,80],[17,105],[43,55],[43,80],[43,105]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#0a1f35" stroke="#2a5080" strokeWidth="0.5"/>
      ))}

      <rect x="170" y="70"  width="24" height="18" fill="#0a1828" rx="1"/>
      <rect x="171" y="71"  width="22" height="16" fill="url(#siWindow)" rx="1"/>
      <line x1="182" y1="71" x2="182" y2="87" stroke="#1a3a5a" strokeWidth="1"/>
      <rect x="170" y="100" width="24" height="16" fill="#0a1828" rx="1"/>
      <rect x="171" y="101" width="22" height="14" fill="url(#siWindow)" rx="1"/>

      {/* Antenna — attachment point at (110,10) */}
      <line x1="110" y1="28" x2="110" y2="10" stroke="#3a6a9a" strokeWidth="2"/>
      <line x1="103" y1="17" x2="117" y2="17" stroke="#3a6a9a" strokeWidth="1.2"/>
      <circle cx="110" cy="10" r="3"  fill="#66aaee" opacity="0.85"/>
      <circle cx="110" cy="10" r="6"  fill="#66aaee" opacity="0.15"/>
      <circle cx="35"  cy="44" r="2.5" fill="#ff4444" opacity="0.75"/>
      <circle cx="185" cy="44" r="2.5" fill="#ff4444" opacity="0.75"/>
    </svg>
  );
}

const TREES = [
  { side: 'left',  pos: '24%', size: '9%',   zIndex: 6 },
  { side: 'left',  pos: '33%', size: '6.5%', zIndex: 5 },
  { side: 'right', pos: '26%', size: '7.5%', zIndex: 6 },
  { side: 'right', pos: '36%', size: '5.5%', zIndex: 5 },
];

function SnowyTree({ style }) {
  return (
    <svg style={style} viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
      <polygon points="40,5  10,60 70,60" fill="#0d2e1a" opacity="0.9"/>
      <polygon points="40,25  8,72 72,72" fill="#0e3420" opacity="0.9"/>
      <polygon points="40,45  6,88 74,88" fill="#0f3a24" opacity="0.9"/>
      <rect x="34" y="88" width="12" height="28" fill="#0a1e10"/>
      <polygon points="40,5  16,52 64,52" fill="#e0f0ff" opacity="0.55"/>
      <polygon points="40,25 14,65 66,65" fill="#e0f0ff" opacity="0.40"/>
      <polygon points="40,45 12,80 68,80" fill="#e0f0ff" opacity="0.28"/>
    </svg>
  );
}

export function SiberiaDecorations() {
  return (
    <>
      {TREES.map((tr, i) => (
        <SnowyTree key={i} style={{
          position: 'absolute', bottom: '36%',
          [tr.side]: tr.pos,
          width: tr.size, zIndex: tr.zIndex, pointerEvents: 'none',
        }}/>
      ))}
      <div style={{
        position: 'absolute', bottom: '38%', left: '30%', right: '30%',
        height: '6%', zIndex: 5, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(180,220,255,.25), rgba(140,200,240,.15))',
        border: '1px solid rgba(160,210,255,.3)', borderRadius: 2,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)',
      }}>
        <svg width="100%" height="100%" viewBox="0 0 200 30" preserveAspectRatio="none">
          <line x1="40"  y1="5"  x2="55"  y2="20" stroke="rgba(180,220,255,.4)"  strokeWidth="0.8"/>
          <line x1="55"  y1="20" x2="70"  y2="12" stroke="rgba(180,220,255,.4)"  strokeWidth="0.8"/>
          <line x1="100" y1="2"  x2="115" y2="18" stroke="rgba(180,220,255,.35)" strokeWidth="0.7"/>
          <line x1="150" y1="8"  x2="165" y2="25" stroke="rgba(180,220,255,.3)"  strokeWidth="0.6"/>
        </svg>
      </div>
    </>
  );
}
