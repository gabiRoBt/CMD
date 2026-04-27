/**
 * End-game cinematic canvas helpers.
 * Each animation function draws its own background every frame.
 * All functions call onDone() when finished.
 */

// ── Easing ─────────────────────────────────────────────────────────────────
const easeInQuad  = t => t * t;
const easeInCubic = t => t * t * t;
const easeOutQuad = t => t * (2 - t);
const lerp        = (a, b, t) => a + (b - a) * t;

// ── Exact sky/ground stops from the arena CSS files ────────────────────────
export const SKIN_THEMES = {
  'skin-classic': {
    sky: [
      [0, '#060d1a'], [0.25, '#0f2040'], [0.50, '#1a3a6a'],
      [0.68, '#4a7aaa'], [0.78, '#8ab4d4'], [0.86, '#c8dde8'],
      [0.94, '#eef6ff'], [1.0, '#f8faff'],
    ],
    ground: [
      [0, '#d8eeff'], [0.3, '#b8d8f0'], [0.7, '#90bce0'], [1, '#6898c8'],
    ],
    sep: '#4a80b0',
  },
  'skin-cyberpunk': {
    sky: [
      [0, '#050010'], [0.30, '#0f0820'], [0.55, '#1a0833'],
      [0.75, '#2d1550'], [1.0, '#1a0f40'],
    ],
    ground: [
      [0, '#1a0033'], [0.5, '#0d001f'], [1, '#060010'],
    ],
    sep: '#550077',
  },
  'skin-wasteland': {
    sky: [
      [0, '#120a04'], [0.2, '#2a1208'], [0.4, '#4a2010'],
      [0.6, '#6b3318'], [0.8, '#8B5A2B'], [1.0, '#a07040'],
    ],
    ground: [
      [0, '#4a3020'], [0.4, '#3a2415'], [1, '#2a1a0a'],
    ],
    sep: '#6b3318',
  },
  'skin-dev-mode': {
    sky: [
      [0, '#5a4020'], [0.4, '#8a6030'], [1.0, '#b08050'],
    ],
    ground: [
      [0, '#c8a060'], [0.5, '#b08848'], [1, '#907040'],
    ],
    sep: '#4a3018',
  },
  'skin-jungle': {
    sky: [
      [0, '#0c1f5a'], [0.06, '#143888'], [0.14, '#1e54b0'],
      [0.26, '#2c72cc'], [0.40, '#3c90de'], [0.55, '#52aaea'],
      [0.70, '#6ec0f4'], [0.84, '#8dd4fa'], [0.94, '#aae6ff'], [1.0, '#c2f0ff'],
    ],
    ground: [
      [0, '#1a3a0a'], [0.35, '#122806'], [0.70, '#0c1c04'], [1, '#080e02'],
    ],
    sep: '#2a6a10',
  },
};

export function getTheme(skin) {
  return SKIN_THEMES[skin] || SKIN_THEMES['skin-classic'];
}

/** Returns a CSS linear-gradient string for a skin's sky. */
export function skyGradientCSS(theme) {
  const stops = theme.sky.map(([s, c]) => `${c} ${(s * 100).toFixed(0)}%`).join(', ');
  return `linear-gradient(to bottom, ${stops})`;
}

/** Returns a CSS linear-gradient string for a skin's ground. */
export function groundGradientCSS(theme) {
  const stops = theme.ground.map(([s, c]) => `${c} ${(s * 100).toFixed(0)}%`).join(', ');
  return `linear-gradient(to bottom, ${stops})`;
}

// ── Background draw helpers ─────────────────────────────────────────────────

/** Sky gradient that fills the entire canvas height (for close-up/nuke_fall). */
function fillSkyFull(ctx, W, H, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  theme.sky.forEach(([s, c]) => g.addColorStop(s, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Full arena background: sky (40%) + separator line + ground (60%).
 * Matches the actual arena layout.
 */
function fillArenaBackground(ctx, W, H, theme) {
  const splitY = H * 0.40;

  const skyG = ctx.createLinearGradient(0, 0, 0, splitY);
  theme.sky.forEach(([s, c]) => skyG.addColorStop(s, c));
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, W, splitY);

  ctx.fillStyle = theme.sep;
  ctx.fillRect(0, splitY, W, 4);

  const gndG = ctx.createLinearGradient(0, splitY + 4, 0, H);
  theme.ground.forEach(([s, c]) => gndG.addColorStop(s, c));
  ctx.fillStyle = gndG;
  ctx.fillRect(0, splitY + 4, W, H - splitY - 4);
}

// ── Aerial bomb — dark, elongated, small swept fins ────────────────────────
/**
 * Classic aerial bomb like the reference image.
 * Very dark body, single white oval highlight, small swept fins at tail.
 * Nose points DOWN (falling).
 */
export function drawBomb(ctx, cx, cy, R) {
  ctx.save();
  ctx.translate(cx, cy);

  const bW = R;       // half-width
  const bH = R * 2.2; // half-height — elongated

  // ── Swept triangular fins (2 visible, at top = tail) ─────────────────────
  const finBotY = -bH * 0.55;
  const finTipY = -bH * 0.98;
  const finOutX = R * 1.12;

  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.moveTo(side * R * 0.28, finBotY);
    ctx.lineTo(side * finOutX,  finTipY + R * 0.1);
    ctx.lineTo(side * R * 0.28, finTipY - R * 0.04);
    ctx.closePath();
    ctx.fillStyle = '#0f0f0f';
    ctx.fill();
    // NO stroke — prevents visible lines on fins
  });

  // ── Main body (elongated ellipse, very dark, no stroke, no highlight) ─────
  const bg = ctx.createLinearGradient(-bW, 0, bW, 0);
  bg.addColorStop(0,    '#040404');
  bg.addColorStop(0.38, '#1a1a1a'); // subtle sheen, not bright
  bg.addColorStop(0.62, '#0e0e0e');
  bg.addColorStop(1,    '#040404');

  ctx.beginPath();
  ctx.ellipse(0, 0, bW, bH, 0, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  // NO stroke and NO highlight — clean dark metal look

  ctx.restore();
}

// ── GREY SMOKE TRAIL (above the tail) ─────────────────────────────────────
function drawSmokeTrail(ctx, cx, tailTopY, trailLen, alpha) {
  for (let i = 0; i < 9; i++) {
    const py = tailTopY - (i / 9) * trailLen;
    const pw = lerp(6, 1.2, i / 9) * (0.6 + Math.random() * 0.4);
    const pa = lerp(alpha * 0.7, 0, i / 9);
    const gv = Math.floor(lerp(100, 40, i / 9));
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      cx + (Math.random() - 0.5) * pw * 0.35,
      py, pw, pw * 0.5, 0, 0, Math.PI * 2,
    );
    ctx.fillStyle = `rgba(${gv},${gv},${gv},${pa})`;
    ctx.fill();
    ctx.restore();
  }
}

// ── VERTICAL SWEEP LINES (bomb falling — lines fly upward past camera) ──────────
// Each line travels bottom→top. Tail is below head. Fully randomised per line.
function drawVerticalSweep(ctx, W, H, elapsed, alpha) {
  if (alpha <= 0) return;
  ctx.save();

  const STREAK_COUNT = 36;

  for (let i = 0; i < STREAK_COUNT; i++) {
    // ── Seeded pseudo-random values (no Math.random — deterministic per line) ──
    const rX     = Math.abs(Math.sin(i * 127.1 + 1.3));   // x position
    const rSpeed = Math.abs(Math.sin(i * 311.7 + 2.7));   // speed
    const rLen   = Math.abs(Math.sin(i * 491.3 + 0.5));   // trail length
    const rBright= Math.abs(Math.sin(i * 173.9 + 4.1));   // brightness
    const rWidth = Math.abs(Math.sin(i * 239.5 + 6.2));   // line width
    const rPhase = Math.abs(Math.sin(i * 613.1 + 3.9));   // phase offset

    const x       = rX * W;
    const speed   = H * (1.2 + rSpeed * 1.8);             // 1.2x–3.0x screen/sec
    const maxLen  = H * (0.18 + rLen * 0.38);             // 18%–56% screen height
    const cycle   = H + maxLen;
    const phase   = rPhase * cycle;

    // Head travels upward: starts at bottom (H + maxLen), ends at top (-maxLen)
    const rawHead  = (elapsed * speed / 1000 + phase) % cycle;
    const headY    = H + maxLen - rawHead;   // top of the moving streak
    const tailY    = headY + maxLen * (0.4 + rLen * 0.6); // tail is BELOW head

    // Skip if entirely off screen
    if (headY > H + maxLen * 0.1 || tailY < -maxLen * 0.1) continue;

    // Fade near top and bottom edges
    const posT = 1 - Math.max(0, Math.min(1, headY / H));
    let fadeAlpha = 1;
    if (posT < 0.07) fadeAlpha = posT / 0.07;
    else if (posT > 0.90) fadeAlpha = (1 - posT) / 0.10;

    const lineAlpha = alpha * fadeAlpha * (0.28 + rBright * 0.62);
    if (lineAlpha < 0.02) continue;

    // Gradient: bright at head (top), fades out at tail (bottom)
    const grad = ctx.createLinearGradient(x, headY, x, tailY);
    grad.addColorStop(0,   `rgba(220,235,255,${lineAlpha})`);
    grad.addColorStop(0.5, `rgba(200,215,255,${lineAlpha * 0.45})`);
    grad.addColorStop(1,   'rgba(200,215,255,0)');

    ctx.globalAlpha = 1;
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 0.5 + rWidth * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, headY);
    ctx.lineTo(x, tailY);
    ctx.stroke();
  }

  ctx.restore();
}

// ── FIRE at bomb TAIL (propulsion flame, pointing UP) ─────────────────────
// tailTopY = cy - bH * 0.98  (top of body ellipse / tail)
function drawTailFire(ctx, cx, tailTopY, R, elapsed, alpha) {
  if (alpha <= 0) return;
  // Multi-frequency flicker for organic feel
  const flicker  = 0.78 + 0.22 * Math.sin(elapsed * 0.025) + 0.08 * Math.sin(elapsed * 0.071);
  const fLen     = R * 4.0 * flicker;   // tall flame
  const fW       = R * 1.3 * flicker;   // wide flame

  ctx.save();

  // ── Outer wide glow halo ───────────────────────────────────────────────
  const halo = ctx.createRadialGradient(
    cx, tailTopY, 0,
    cx, tailTopY - fLen * 0.4, fW * 2.2,
  );
  halo.addColorStop(0,   `rgba(255,120,0,${alpha * 0.55})`);
  halo.addColorStop(0.45, `rgba(255,50,0,${alpha * 0.28})`);
  halo.addColorStop(1,   'rgba(200,10,0,0)');
  ctx.beginPath();
  ctx.ellipse(cx, tailTopY - fLen * 0.35, fW * 2.0, fLen * 0.65, 0, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  // ── Main orange flame body ─────────────────────────────────────────────
  const og = ctx.createRadialGradient(
    cx, tailTopY, 0,
    cx, tailTopY - fLen * 0.55, fW * 1.2,
  );
  og.addColorStop(0,   `rgba(255,200,60,${alpha * 0.92})`);
  og.addColorStop(0.35, `rgba(255,110,10,${alpha * 0.78})`);
  og.addColorStop(0.7, `rgba(255,50,0,${alpha * 0.45})`);
  og.addColorStop(1,   'rgba(200,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(cx, tailTopY - fLen * 0.45, fW * 1.1, fLen * 0.52, 0, 0, Math.PI * 2);
  ctx.fillStyle = og;
  ctx.fill();

  // ── Bright white-yellow inner core ────────────────────────────────────
  const core = ctx.createRadialGradient(
    cx, tailTopY - fLen * 0.08, 0,
    cx, tailTopY - fLen * 0.18, fW * 0.55,
  );
  core.addColorStop(0, `rgba(255,255,220,${alpha})`);
  core.addColorStop(0.5, `rgba(255,230,80,${alpha * 0.85})`);
  core.addColorStop(1, 'rgba(255,150,0,0)');
  ctx.beginPath();
  ctx.ellipse(cx, tailTopY - fLen * 0.14, fW * 0.48, fLen * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();

  ctx.restore();
}

// ───────────────────────────────────────────────────────────────────────────────
// PHASE 1: Camera-on-bomb (6500ms)
// Bomb fixed in center. Horizontal streaks sweep left↔right past the camera.
// ───────────────────────────────────────────────────────────────────────────────
export function animNukeFall(canvas, ctx, skin, onDone) {
  const DURATION = 6500;
  const BOMB_R   = 65;
  const theme    = getTheme(skin);
  let start = null;
  let raf;

  function frame(ts) {
    if (!start) start = ts;
    const t       = Math.min((ts - start) / DURATION, 1);
    const elapsed = ts - start;

    const W  = canvas.width;
    const H  = canvas.height;
    const cx = W / 2;
    const cy = H * 0.44; // fixed center

    ctx.clearRect(0, 0, W, H);
    fillSkyFull(ctx, W, H, theme);

    // Vertical sweep lines falling top→bottom (camera-on-bomb sensation)
    const sweepAlpha = Math.min(1, Math.max(0, (t - 0.05) / 0.15));
    drawVerticalSweep(ctx, W, H, elapsed, sweepAlpha);

    // Tail fire BEHIND the bomb (drawn before bomb so bomb renders on top)
    const tailTopY  = cy - BOMB_R * 2.2 * 0.98;
    const fireAlpha = Math.min(1, Math.max(0, (t - 0.04) / 0.12));
    drawTailFire(ctx, cx, tailTopY, BOMB_R, elapsed, fireAlpha);

    drawBomb(ctx, cx, cy, BOMB_R);

    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, W, H);
      onDone?.();
    }
  }

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// ───────────────────────────────────────────────────────────────────────────────
// PHASE 2: Bomb approaches base (6400ms)
// Bomb constant size, falls from top to above base. No speed lines.
// ───────────────────────────────────────────────────────────────────────────────
export function animBombApproach(canvas, ctx, targetY, skin, onDone) {
  const DURATION = 1800;   // fast drop
  const BOMB_R   = 28;     // smaller — far away, approaching from altitude
  const theme    = getTheme(skin);
  let start = null;
  let raf;

  function frame(ts) {
    if (!start) start = ts;
    const t       = Math.min((ts - start) / DURATION, 1);
    const et      = easeInQuad(t);
    const elapsed = ts - start;

    const W  = canvas.width;
    const H  = canvas.height;
    const cx = W / 2;

    ctx.clearRect(0, 0, W, H);
    fillArenaBackground(ctx, W, H, theme);

    // Bomb falls from above screen to just above targetY
    const bH     = BOMB_R * 2.2;
    const destCy = targetY - bH * 0.98 - 8;
    const cy     = lerp(-80, destCy, et);

    // Tail fire at top of bomb (drawn before bomb body)
    const tailTopY2 = cy - bH * 0.98; // (was tailTopY)
    const fireAlpha = Math.min(1, t * 4);
    if (cy > -bH) drawTailFire(ctx, cx, tailTopY2, BOMB_R, elapsed, fireAlpha);

    drawBomb(ctx, cx, cy, BOMB_R);

    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      onDone?.();
    }
  }

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// ── PHASE 3: Blast + fast whiteout (2500ms) ───────────────────────────────
export function animNukeBlast(canvas, ctx, cx, cy, skin, onDone) {
  const DURATION = 2500;
  const theme    = getTheme(skin);
  const diagR    = Math.hypot(
    canvas.width  || window.innerWidth,
    canvas.height || window.innerHeight,
  );
  let start = null;
  let raf;

  function frame(ts) {
    if (!start) start = ts;
    const t  = Math.min((ts - start) / DURATION, 1);

    const W = canvas.width  || window.innerWidth;
    const H = canvas.height || window.innerHeight;

    ctx.clearRect(0, 0, W, H);
    fillArenaBackground(ctx, W, H, theme);

    // ── Shockwave ring (t: 0 → 0.18, quick burst) ─────────────────────────
    const rT  = Math.min(t / 0.18, 1);
    const rET = easeOutQuad(rT);
    const rR  = diagR * 0.88 * rET;
    const rAl = Math.max(0, 1 - rET * 1.6);

    if (rAl > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,210,90,${rAl * 0.5})`;
      ctx.lineWidth = 26 * (1 - rET * 0.6);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${rAl * 0.85})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 28; ctx.shadowColor = '#fff';
      ctx.stroke();
      ctx.restore();
    }

    // ── Initial flash (brief, t < 0.08) ────────────────────────────────────
    const flashAl = Math.max(0, 1 - t / 0.08);
    if (flashAl > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashAl})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Whiteout slams in right after shockwave (t: 0.18 → 0.45) ──────────
    if (t > 0.18) {
      const wt  = Math.min((t - 0.18) / 0.27, 1); // fully opaque by t=0.45
      const wet = easeInQuad(wt);
      const wR  = diagR * 1.1 * wet;
      const wAl = Math.min(1, wet * 2.8);           // opaque quickly

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, wR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${wAl})`;
      ctx.fill();
      ctx.restore();
    }

    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      onDone?.();
    }
  }

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
