export function BaseRetro() {
  return (
    <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <linearGradient id="retPyramid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#280055"/>
          <stop offset="50%"  stopColor="#1a0033"/>
          <stop offset="100%" stopColor="#0d0022"/>
        </linearGradient>
        <linearGradient id="retScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#220040"/>
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
      {[20,40,60,80,100,120,140,160,180].map((x,i) => (
        <line key={i} x1={x} y1="145" x2={x} y2="180" stroke="#ff00ff" strokeWidth="0.35" opacity="0.25"/>
      ))}
      {[150,158,166,174].map((y,i) => (
        <line key={i} x1="0" y1={y} x2="200" y2={y} stroke="#ff00ff" strokeWidth="0.35" opacity="0.2"/>
      ))}

      <polygon points="100,8 178,145 22,145" fill="url(#retPyramid)"/>
      <polygon points="100,8 178,145 22,145" fill="none" stroke="#ff00ff" strokeWidth="1.8" filter="url(#retGlow)" opacity="0.9"/>
      <polygon points="100,8 178,145 22,145" fill="none" stroke="#dd00dd" strokeWidth="0.7"/>
      {[[82,55,118,55],[68,80,132,80],[54,105,146,105],[40,130,160,130]].map(([x1,y,x2],i) => (
        <g key={i}>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="#ff00ff" strokeWidth="3"   opacity={0.08 - i*0.01}/>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="#ff00ff" strokeWidth="0.8" opacity={0.55 - i*0.08}/>
        </g>
      ))}

      <rect x="84" y="8" width="32" height="56" fill="#200044"/>
      {[[88,14,'#ff00ff',0.7],[88,24,'#ff00ff',0.55],[88,34,'#ffff00',0.5],[88,44,'#ff00ff',0.4]].map(([x,y,col,op],i) => (
        <rect key={i} x={x} y={y} width="24" height="4" fill={col} opacity={op} rx="0.5"/>
      ))}

      <rect x="26"  y="86" width="30" height="44" fill="url(#retScreen)" stroke="#ff00ff" strokeWidth="0.8" opacity="0.95"/>
      {[92,99,106,113,120,126].map((y,i) => (
        <line key={i} x1="28" y1={y} x2={46+Math.sin(i*1.2)*10} y2={y} stroke={i%2?'#ff00ff':'#ffff00'} strokeWidth="0.7" opacity="0.5"/>
      ))}
      <rect x="144" y="86" width="30" height="44" fill="url(#retScreen)" stroke="#ffff00" strokeWidth="0.8" opacity="0.95"/>
      {[92,99,106,113,120,126].map((y,i) => (
        <line key={i} x1="146" y1={y} x2={164+Math.sin(i*1.5)*8} y2={y} stroke={i%2?'#ffff00':'#ff00ff'} strokeWidth="0.7" opacity="0.5"/>
      ))}

      <rect x="50"  y="108" width="18" height="24" fill="#100020" stroke="#ff00ff" strokeWidth="0.8"/>
      <rect x="52"  y="110" width="14" height="20" fill="#ff00ff" opacity="0.1"/>
      <rect x="132" y="108" width="18" height="24" fill="#100020" stroke="#ffff00" strokeWidth="0.8"/>
      <rect x="134" y="110" width="14" height="20" fill="#ffff00" opacity="0.09"/>
      <rect x="84"  y="116" width="32" height="29" fill="#050010"/>
      <rect x="86"  y="118" width="13" height="25" fill="#180030"/>
      <rect x="101" y="118" width="13" height="25" fill="#130028"/>
      <line x1="100" y1="118" x2="100" y2="145" stroke="#ff00ff" strokeWidth="0.8" opacity="0.5"/>

      {/* Apex — antenna attachment at (100,8) */}
      <circle cx="100" cy="8" r="5"  fill="#ff00ff" opacity="0.95" filter="url(#retGlowStrong)"/>
      <circle cx="100" cy="8" r="12" fill="#ff00ff" opacity="0.12"/>
      <line x1="22"  y1="145" x2="15"  y2="116" stroke="#ff00ff" strokeWidth="1.2" opacity="0.7"/>
      <circle cx="15"  cy="115" r="2.5" fill="#ff00ff" opacity="0.8" filter="url(#retGlow)"/>
      <line x1="178" y1="145" x2="185" y2="116" stroke="#ffff00" strokeWidth="1.2" opacity="0.7"/>
      <circle cx="185" cy="115" r="2.5" fill="#ffff00" opacity="0.8" filter="url(#retGlow)"/>
      {[[55,68,1.5,'#ff00ff'],[145,75,1.2,'#ffff00'],[80,40,1.8,'#ff00ff'],[120,35,1.4,'#ffff00']].map(([x,y,r,c],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={c} opacity={0.5+i*0.1} filter="url(#retGlow)"/>
      ))}
    </svg>
  );
}

export function RetroDecorations() {
  return (
    <>
      <div style={{ position:'absolute', inset:0, zIndex:5, pointerEvents:'none', overflow:'hidden' }}>
        <div className="cyber-scanline"/>
      </div>
      {[
        { side:'left',  borderColor:'rgba(255,0,255,.2)', altClass:'' },
        { side:'right', borderColor:'rgba(255,255,0,.2)', altClass:' matrix-col-alt' },
      ].map(({ side, borderColor, altClass }, i) => (
        <div key={i} style={{
          position:'absolute', top:'5%', bottom:'40%',
          [side]:'2%', width:'2.5%',
          zIndex:6, pointerEvents:'none', overflow:'hidden',
          border:`1px solid ${borderColor}`, background:'rgba(20,0,40,.4)',
        }}>
          <div className={`matrix-col${altClass}`} style={{ '--delay': i === 0 ? '0s' : '-2s' }}/>
        </div>
      ))}
      <div style={{
        position:'absolute', top:'6%', left:'50%', transform:'translateX(-50%)',
        zIndex:6, pointerEvents:'none',
        border:'1px solid rgba(255,0,255,.35)', background:'rgba(15,0,30,.7)',
        padding:'4px 14px', fontFamily:'monospace', fontSize:9,
        color:'rgba(255,0,255,.7)', letterSpacing:'.15em', backdropFilter:'blur(4px)',
      }}>
        THREAT LEVEL: CRITICAL · SYS: ONLINE
      </div>
    </>
  );
}
