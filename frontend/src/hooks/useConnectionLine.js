import { useEffect, useRef } from 'react';
import { ANTENNA_FRAC } from '../constants/skins';

/**
 * Draws an animated dashed Bezier arc from the terminal window's side wall
 * to the connected base's antenna. Cancels itself on game over.
 */
export function useConnectionLine({ lineCanvasRef, termWinRef, skin, phase, gameOver }) {
  const rafRef = useRef(null);

  // Resize canvas to viewport
  useEffect(() => {
    const canvas = lineCanvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [lineCanvasRef]);

  // Stop on game over
  useEffect(() => {
    if (!gameOver) return;
    cancelAnimationFrame(rafRef.current);
    const ctx = lineCanvasRef.current?.getContext('2d');
    ctx?.clearRect(0, 0, lineCanvasRef.current.width, lineCanvasRef.current.height);
  }, [gameOver, lineCanvasRef]);

  // Animation loop
  useEffect(() => {
    const canvas = lineCanvasRef.current;
    if (!canvas || gameOver) return;

    const isEnemy = phase === 'infiltrate';
    let offset    = 0;

    const getAntenna = (side) => {
      const el = document.querySelector(side === 'left' ? '.left-base-pos' : '.right-base-pos');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const frac = ANTENNA_FRAC[skin] ?? { x: 0.5, y: 0.05 };
      return { x: rect.left + rect.width * frac.x, y: rect.top + rect.height * frac.y };
    };

    const draw = () => {
      const ctx     = canvas.getContext('2d');
      const termWin = termWinRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!termWin) { rafRef.current = requestAnimationFrame(draw); return; }

      const tRect = termWin.getBoundingClientRect();
      const sx    = isEnemy ? tRect.right  : tRect.left;
      const sy    = tRect.top + tRect.height / 2;
      const ant   = getAntenna(isEnemy ? 'right' : 'left');

      if (!ant) { rafRef.current = requestAnimationFrame(draw); return; }

      const color = isEnemy ? '#C0704A' : '#00ff41';
      const cpx   = (sx + ant.x) / 2;
      const cpy   = Math.min(sy, ant.y) - 55;
      offset = (offset + 0.5) % 26;

      // Glow
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.globalAlpha = 0.1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpx, cpy, ant.x, ant.y); ctx.stroke();
      ctx.restore();

      // Dashed line
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
      ctx.setLineDash([10, 16]); ctx.lineDashOffset = -offset;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpx, cpy, ant.x, ant.y); ctx.stroke();
      ctx.restore();

      // Dots
      [[ant.x, ant.y, 4, 0.9], [sx, sy, 3, 0.6]].forEach(([x, y, r, a]) => {
        ctx.save();
        ctx.fillStyle = color; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [lineCanvasRef, termWinRef, phase, skin, gameOver]);
}
