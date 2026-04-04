export function BaseDevMode() {
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

const FRAME_STYLE = {
  position: 'absolute', zIndex: 8, pointerEvents: 'none',
  border: '2px solid rgba(0,0,0,0.8)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  background: 'rgba(5,4,3,0.08)', overflow: 'hidden',
};

const IMG_STYLE = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' };

const DECO_ITEMS = [
  { src: 'assets/cactus.jpeg', alt: 'cactus', style: { bottom: '7%',  left: '33%', width: '7%',  aspectRatio: '0.5/1' } },
  { src: 'assets/sarpe.jpeg',  alt: 'snake',  style: { bottom: '10%', left: '43%', width: '6%',  aspectRatio: '1/0.75' } },
  { src: 'assets/rafala.jpeg', alt: 'wind',   style: { bottom: '5%',  left: '51%', width: '10%', aspectRatio: '2.2/1' } },
];

export function DevModeDecorations() {
  return (
    <>
      {DECO_ITEMS.map(({ src, alt, style }) => (
        <div key={src} style={{ ...FRAME_STYLE, ...style }}>
          <img src={src} alt={alt} style={IMG_STYLE} onError={e => { e.target.style.display = 'none'; }}/>
        </div>
      ))}
    </>
  );
}
