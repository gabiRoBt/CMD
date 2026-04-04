import { useCallback } from 'react';
import { ABILITY_DEFS } from '../constants/abilities';
import { animProjectile, animRepair, animSonar } from '../canvas/animations';

const BASE_X_FRAC = { left: 0.18, right: 0.82 };
const BASE_Y_FRAC = 0.67;

function getBasePos(arenaEl, side) {
  return {
    x: arenaEl.offsetWidth  * BASE_X_FRAC[side],
    y: arenaEl.offsetHeight * BASE_Y_FRAC,
  };
}

/**
 * Returns a stable `fireAnimation(name, direction)` callback.
 * Reads canvasRef and arenaRef at call time so it never goes stale.
 */
export function useStrikeCanvas(canvasRef, arenaRef) {
  const fireAnimation = useCallback((name, direction = 'outgoing') => {
    const canvas = canvasRef.current;
    const arena  = arenaRef.current;
    if (!canvas || !arena) return;

    canvas.width  = arena.offsetWidth;
    canvas.height = arena.offsetHeight;

    const ctx   = canvas.getContext('2d');
    const left  = getBasePos(arena, 'left');
    const right = getBasePos(arena, 'right');
    const col   = ABILITY_DEFS[name]?.color ?? '#C0A050';

    if (direction === 'outgoing') {
      if (name === 'repair')     animRepair(ctx, canvas, left.x, left.y);
      else if (name === 'sonar') animSonar(ctx, canvas, left.x, left.y, right.x, right.y, col);
      else                       animProjectile(ctx, canvas, arena, left.x, left.y, right.x, right.y, col);
    } else {
      // incoming: right → left
      if (name === 'sonar') animSonar(ctx, canvas, right.x, right.y, left.x, left.y, col);
      else                  animProjectile(ctx, canvas, arena, right.x, right.y, left.x, left.y, col);
    }
  }, [canvasRef, arenaRef]);

  return { fireAnimation };
}
