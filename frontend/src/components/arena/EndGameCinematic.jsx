import { useEffect, useRef, useState } from 'react';
import { SKIN_BASES } from '../../skins';
import {
  SKIN_THEMES,
  skyGradientCSS,
  groundGradientCSS,
  animNukeFall,
  animBombApproach,
  animNukeBlast,
} from '../../canvas/endgameAnimations';
import { sounds, fadeOutBGM } from '../../utils/sounds';

// ─────────────────────────────────────────────────────────────────────────────
// Sequence (WIN/LOSE):
//   'blackout'   500ms   → fade arena to black
//   'nuke_fall'  6500ms  → close-up: bomb fills sky, grows toward viewer
//   'base_view'  6400ms  → arena scene: loser base centered, bomb falls toward it
//   'blast'      5750ms  → shockwave ring + full whiteout from center
//   → onComplete() (canvas stays white below GameOverOverlay at z:9999)
//
// Sequence (DRAW):
//   'blackout'    500ms
//   'draw_base1'  5000ms → base 1 with name
//   'draw_base2'  5000ms → base 2 with name
//   → onComplete()
// ─────────────────────────────────────────────────────────────────────────────

function DrawBasePanel({ Base, label, role, visible, theme }) {
  const skyBg = skyGradientCSS(theme);
  const groundBg = groundGradientCSS(theme);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.38s ease',
      pointerEvents: 'none',
    }}>
      {/* ── Background layers mimicking arena ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: skyBg }} />
      <div style={{ position: 'absolute', top: '40%', left: 0, right: 0, height: 4, background: theme.sep }} />
      <div style={{ position: 'absolute', top: 'calc(40% + 4px)', bottom: 0, left: 0, right: 0, background: groundBg }} />

      {/* ── Foreground ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: '9%', // exactly the same as base_view
      }}>
        {/* Texts above the base */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            fontFamily: 'monospace', fontSize: '9px',
            letterSpacing: '0.22em', color: 'rgba(200,220,255,0.5)',
            textTransform: 'uppercase', marginBottom: 18,
          }}>
            ◈ SATELLITE FEED — BASE {role} ◈
          </div>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: '1.35rem', fontWeight: 700,
            letterSpacing: '0.2em', color: '#e8f4ff',
            textShadow: '0 0 22px rgba(180,220,255,0.8)',
            borderTop: '1px solid rgba(180,220,255,0.2)',
            borderBottom: '1px solid rgba(180,220,255,0.2)',
            padding: '7px 22px',
          }}>{label}</div>
          <div style={{
            fontFamily: 'monospace', fontSize: '9px',
            color: 'rgba(180,220,255,0.4)', letterSpacing: '0.14em', marginTop: 10,
          }}>INTACT — NO STRIKE CONFIRMED</div>
        </div>

        {/* The Base sits on the ground */}
        <div style={{ width: '30%', maxWidth: 280, minWidth: 155, aspectRatio: '1.2/1' }}>
          <Base />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function EndGameCinematic({ info, playerID, skin = 'skin-classic', onComplete }) {
  const Base  = SKIN_BASES[skin] ?? SKIN_BASES['skin-classic'];
  const theme = SKIN_THEMES[skin] || SKIN_THEMES['skin-classic'];

  const canvasRef = useRef(null);
  const cancelRef = useRef(null);
  const baseRef   = useRef(null);

  const [phase,         setPhase]         = useState('blackout');
  const [overlayAlpha,  setOverlayAlpha]  = useState(0); // blackout fade
  const [showCanvas,    setShowCanvas]    = useState(false);
  const [showBaseHTML,  setShowBaseHTML]  = useState(false);
  const [showLoserName, setShowLoserName] = useState(false);
  const [draw1Visible,  setDraw1Visible]  = useState(false);
  const [draw2Visible,  setDraw2Visible]  = useState(false);

  const isDraw    = info?.draw;
  // `info.won` is the correct field set by Arena.jsx (won: p.you_won)
  const loserID   = info?.loser_id  || (info?.won === false ? playerID : 'UNKNOWN');
  const winnerLabel = info?.winner_id || playerID || 'PLAYER 1';

  // ── Canvas size ────────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => () => cancelRef.current?.(), []);

  // ── Phase machine ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!info) return;

    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext('2d');

    // ── BLACKOUT ────────────────────────────────────────────────────────────
    if (phase === 'blackout') {
      fadeOutBGM(600);
      setShowCanvas(false);
      setOverlayAlpha(0);

      let start = null;
      let raf;
      const animate = (ts) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / 500, 1);
        setOverlayAlpha(t);
        if (t < 1) {
          raf = requestAnimationFrame(animate);
        } else {
          // Hand off to canvas — canvas will render its own background
          setShowCanvas(true);
          setOverlayAlpha(0); // hide HTML overlay div
          setTimeout(() => setPhase(isDraw ? 'draw_base1' : 'nuke_fall'), 80);
        }
      };
      raf = requestAnimationFrame(animate);
      cancelRef.current = () => cancelAnimationFrame(raf);
    }

    // ── NUKE FALL (close-up, sky bg on canvas) ─────────────────────────────
    else if (phase === 'nuke_fall') {
      if (!ctx) return;
      sounds.nukeWhistle?.();
      cancelRef.current = animNukeFall(canvas, ctx, skin, () => setPhase('base_view'));
    }

    // ── BASE VIEW (arena bg on canvas + HTML base) ─────────────────────────
    else if (phase === 'base_view') {
      if (!ctx) return;
      setShowBaseHTML(true);
      setTimeout(() => setShowLoserName(true), 500);

      // One frame for React to layout the base HTML
      requestAnimationFrame(() => {
        const baseEl  = baseRef.current;
        const targetY = baseEl
          ? baseEl.getBoundingClientRect().top
          : canvas.height * 0.62;

        cancelRef.current = animBombApproach(canvas, ctx, targetY, skin, () => {
          setShowBaseHTML(false);
          setShowLoserName(false);
          setPhase('blast');
        });
      });
    }

    // ── BLAST — whiteout from center, then GameOverOverlay ─────────────────
    else if (phase === 'blast') {
      setShowBaseHTML(false);
      setShowLoserName(false);
      const cx = (canvas?.width  || window.innerWidth)  / 2;
      const cy = (canvas?.height || window.innerHeight) * 0.62;
      sounds.nukeBlast?.();

      // Run canvas animation (cosmetic — does NOT block onComplete)
      if (ctx) {
        cancelRef.current = animNukeBlast(canvas, ctx, cx, cy, skin, () => {});
      }

      // onComplete is ALWAYS called via timeout — not via canvas callback.
      // This is the reliable path to the win screen regardless of canvas state.
      const t = setTimeout(() => onComplete?.(), 2900); // blast 2500ms + 400ms buffer
      const prevCancel = cancelRef.current;
      cancelRef.current = () => {
        clearTimeout(t);
        prevCancel?.();
      };
    }

    // ── DRAW BASE 1 ────────────────────────────────────────────────────────
    else if (phase === 'draw_base1') {
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setShowCanvas(false);
      setDraw1Visible(true);
      setDraw2Visible(false);
      const t = setTimeout(() => {
        setDraw1Visible(false);
        setTimeout(() => setPhase('draw_base2'), 380);
      }, 5000);
      cancelRef.current = () => clearTimeout(t);
    }

    // ── DRAW BASE 2 ────────────────────────────────────────────────────────
    else if (phase === 'draw_base2') {
      setDraw2Visible(true);
      const t = setTimeout(() => {
        setDraw2Visible(false);
        setTimeout(() => onComplete?.(), 380);
      }, 5000);
      cancelRef.current = () => clearTimeout(t);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, info]);

  if (!info) return null;

  return (
    <div
      id="end-game-cinematic"
      style={{
        position: 'fixed', inset: 0,
        zIndex: 9000,
        overflow: 'hidden',
        // Use first sky color as base bg — canvas paints over it immediately
        background: theme.sky[0][1],
        pointerEvents: 'all',
      }}
    >
      {/* ── Black fade-in during blackout (z=1) ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: '#000',
        opacity: overlayAlpha,
        transition: overlayAlpha === 0 ? 'opacity 0.18s' : 'none',
        pointerEvents: 'none',
      }} />

      {/* ── Canvas (z=2): paints sky/ground/bomb/blast – ends white ── */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: showCanvas ? 'block' : 'none',
          pointerEvents: 'none',
        }}
      />

      {/* ── Base view HTML overlay (z=3): loser base + name ── */}
      {phase === 'base_view' && showBaseHTML && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          paddingBottom: '9%',
          pointerEvents: 'none',
        }}>
          {/* Loser name (fades in after 500ms) */}
          <div style={{
            textAlign: 'center', marginBottom: 16,
            opacity: showLoserName ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}>
            <div style={{
              fontFamily: 'monospace', fontSize: '9px',
              letterSpacing: '0.22em',
              color: 'rgba(220,80,50,0.85)',
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              ▼ TARGET ACQUIRED ▼
            </div>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: '1.35rem', fontWeight: 700,
              letterSpacing: '0.2em', color: '#fff',
              textShadow: '0 0 22px rgba(255,100,60,0.9)',
              borderTop: '1px solid rgba(220,80,50,0.35)',
              borderBottom: '1px solid rgba(220,80,50,0.35)',
              padding: '6px 22px',
            }}>
              {loserID}
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: '8px',
              color: 'rgba(220,80,50,0.6)', letterSpacing: '0.15em',
              marginTop: 8,
            }}>IMPACT IMMINENT</div>
          </div>

          {/* Loser base — baseRef used by animBombApproach for targeting */}
          <div
            ref={baseRef}
            style={{ width: '30%', maxWidth: 280, minWidth: 155, aspectRatio: '1.2/1' }}
          >
            <Base />
          </div>
        </div>
      )}

      {/* ── Draw panels ── */}
      {isDraw && (
        <>
          <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
            <DrawBasePanel
              Base={Base} label={winnerLabel}
              role="ALPHA" visible={draw1Visible} theme={theme}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
            <DrawBasePanel
              Base={Base} label={loserID || 'OPPONENT'}
              role="BETA"  visible={draw2Visible} theme={theme}
            />
          </div>
        </>
      )}
    </div>
  );
}
