/**
 * All canvas animation helpers are pure imperative functions.
 * They accept a CanvasRenderingContext2D and coordinates, run their own
 * setInterval loops, and clean up after themselves.
 */

/** Parabolic projectile with trail + impact rings. */
export function animProjectile(ctx, canvas, arena, sx, sy, tx, ty, col) {
  const trail = [];
  let tick = 0;

  const iv = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tick++;

    const prog = tick / 52;
    const ease = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
    const cx   = sx + (tx - sx) * ease;
    const cy   = sy + (ty - sy) * ease - Math.sin(prog * Math.PI) * (arena.offsetHeight * 0.38);

    trail.push({ x: cx, y: cy });
    if (trail.length > 22) trail.shift();

    trail.forEach((p, i) => {
      const alpha  = (i / trail.length) * 0.55;
      const radius = 1.5 + (i / trail.length) * 3.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = col + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle   = col;
    ctx.shadowBlur  = 16;
    ctx.shadowColor = col;
    ctx.fill();
    ctx.restore();

    if (tick < 52) return;

    clearInterval(iv);
    let ring = 0;
    const ex = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ring++;
      ctx.save();
      ctx.beginPath();
      ctx.arc(tx, ty, ring * 10, 0, Math.PI * 2);
      ctx.strokeStyle  = col;
      ctx.lineWidth    = 2.5;
      ctx.globalAlpha  = Math.max(0, 1 - ring * 0.26);
      ctx.stroke();
      ctx.restore();
      if (ring >= 4) { clearInterval(ex); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }, 70);
  }, 16);
}

/** Expanding hexagon rings at the player's own base (repair). */
export function animRepair(ctx, canvas, cx, cy) {
  const col  = '#4A8C42';
  let tick   = 0;

  const iv = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tick++;
    const prog = tick / 65;

    if (prog > 1) {
      clearInterval(iv);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const maxR = (canvas.offsetWidth || 400) * 0.12;

    for (let ring = 0; ring < 3; ring++) {
      const r  = maxR * (0.5 + ring * 0.25) * Math.sin(prog * Math.PI);
      const al = (1 - prog) * (1 - ring * 0.28);
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const angle = (s / 6) * Math.PI * 2 - Math.PI / 6;
        const px    = cx + r * Math.cos(angle);
        const py    = cy + r * Math.sin(angle);
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2 - ring * 0.5;
      ctx.globalAlpha = al;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, 10 * (1 - prog), 0, Math.PI * 2);
    ctx.fillStyle   = col;
    ctx.globalAlpha = (1 - prog) * 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  }, 16);
}

/** Expanding scan rings with directional lines from src toward dst. */
export function animSonar(ctx, canvas, srcX, srcY, dstX, dstY, col) {
  const maxR      = Math.hypot(dstX - srcX, dstY - srcY) * 1.2;
  const baseAngle = Math.atan2(dstY - srcY, dstX - srcX);
  let frame       = 0;

  const iv = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    for (let w = 0; w < 4; w++) {
      const delay = w * 18;
      if (frame < delay) continue;

      const prog = Math.min((frame - delay) / 75, 1);
      const r    = prog * maxR;
      const al   = (1 - prog) * 0.65;

      ctx.beginPath();
      ctx.arc(srcX, srcY, r, 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = al;
      ctx.stroke();

      for (let d = -1; d <= 1; d++) {
        const ang = baseAngle + d * 0.4 + prog * 0.3;
        ctx.beginPath();
        ctx.moveTo(srcX, srcY);
        ctx.lineTo(srcX + r * Math.cos(ang), srcY + r * Math.sin(ang));
        ctx.strokeStyle = col;
        ctx.lineWidth   = 0.8;
        ctx.globalAlpha = al * 0.4;
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    if (frame > 75 + 3 * 18 + 15) { clearInterval(iv); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }, 16);
}
