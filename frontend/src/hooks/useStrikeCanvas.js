import { useCallback, useRef } from 'react';
import { ABILITY_DEFS } from '../constants/abilities';
import { animProjectile, animRocket, animRepair, animSonar } from '../canvas/animations';

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
 * Cancels any running animation before starting a new one.
 */
export function useStrikeCanvas(canvasRef, arenaRef) {
  const cancelRef = useRef(null);

  const fireAnimation = useCallback((name, direction = 'outgoing') => {
    const canvas = canvasRef.current;
    const arena  = arenaRef.current;
    if (!canvas || !arena) return;

    // Cancel any running animation before touching the canvas
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }

    // Only reset canvas dimensions if they actually changed —
    // assigning canvas.width/height ALWAYS clears the canvas and resets the
    // 2D context state, which was causing mid-animation freezes.
    if (canvas.width !== arena.offsetWidth || canvas.height !== arena.offsetHeight) {
      canvas.width  = arena.offsetWidth;
      canvas.height = arena.offsetHeight;
    }

    const ctx   = canvas.getContext('2d');
    const left  = getBasePos(arena, 'left');
    const right = getBasePos(arena, 'right');
    const col   = ABILITY_DEFS[name]?.color ?? '#C0A050';

    let cancel = null;
    if (direction === 'outgoing') {
      if (name === 'repair')       cancel = animRepair(ctx, canvas, left.x, left.y);
      else if (name === 'sonar')   cancel = animSonar(ctx, canvas, left.x, left.y, right.x, right.y, col);
      else if (name === 'rocket')  cancel = animRocket(ctx, canvas, arena, left.x, left.y, right.x, right.y, col);
      else                         cancel = animProjectile(ctx, canvas, arena, left.x, left.y, right.x, right.y, col);
    } else {
      // incoming: right → left
      if (name === 'sonar')        cancel = animSonar(ctx, canvas, right.x, right.y, left.x, left.y, col);
      else if (name === 'rocket')  cancel = animRocket(ctx, canvas, arena, right.x, right.y, left.x, left.y, col);
      else                         cancel = animProjectile(ctx, canvas, arena, right.x, right.y, left.x, left.y, col);
    }

    cancelRef.current = cancel ?? null;
  }, [canvasRef, arenaRef]);

  return { fireAnimation };
}
