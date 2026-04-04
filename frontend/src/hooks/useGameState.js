import { useState, useRef, useCallback } from 'react';
import { SETUP_SECONDS, INFILTRATE_SECONDS, PHASE } from '../constants/game';

/**
 * Owns every piece of state that the WS event stream can mutate during a match.
 * Returns the state slice and a stable `handleWSEvent` callback.
 */
export function useGameState({ startCountdown, onGameStart }) {
  const [phase, setPhase] = useState(null);
  const [abilities, setAbilities] = useState([]);
  const [incomingAbility, setIncomingAbility] = useState(null);

  // playerID is stored in a ref so the WS closure never captures a stale value
  const playerIDRef = useRef(null);

  const handleWSEvent = useCallback((ev) => {
    switch (ev.type) {
      case 'arena_list':
        // Handled externally (App needs it for the lobby list)
        break;

      case 'game_start':
        setPhase(ev.payload.phase);
        setAbilities([]);
        setIncomingAbility(null);
        startCountdown(ev.payload.setup_seconds ?? SETUP_SECONDS);
        onGameStart(ev.payload);
        break;

      case 'phase_change':
        setPhase(ev.payload.phase);
        if (ev.payload.phase === PHASE.INFILTRATE) startCountdown(INFILTRATE_SECONDS);
        break;

      case 'pouch_result':
        setAbilities(ev.payload.abilities ?? []);
        break;

      case 'ability_fired': {
        const { target_id, ability } = ev.payload;
        // Set incomingAbility for any event that targets us:
        //   • scramble / rocket  → enemy attacked us  → activate debuff
        //   • repair             → we repaired ourselves → cancel active debuff
        if (target_id === playerIDRef.current && ability) {
          setIncomingAbility({ name: ability, id: Date.now() });
        }
        break;
      }

      case 'game_over':
        window.dispatchEvent(new CustomEvent('gameOver', { detail: ev.payload }));
        break;

      default:
        break;
    }
  }, [startCountdown, onGameStart]);

  return { phase, abilities, incomingAbility, playerIDRef, handleWSEvent };
}
