import { useState, useCallback } from 'react';
import { api } from '../api';
import { ABILITY_EFFECTS } from '../constants/abilities';
import { PHASE } from '../constants/game';

/**
 * Manages the player's ability usage within a match.
 *
 * - All abilities except `repair` are marked used optimistically before the
 *   server responds (fire-and-forget).
 * - `repair` waits for server confirmation so it stays available if the 5-second
 *   window has already expired.
 *
 * Returns { usedAbilities, triggerAbility }.
 * `triggerAbility` also fires the canvas animation and shows a notification.
 */
export function useAbilities({ arenaID, playerID, phase, lang, fireAnimation, showNotif }) {
  const [usedAbilities, setUsedAbilities] = useState(new Set());

  const markUsed = useCallback((name) => {
    setUsedAbilities(prev => new Set([...prev, name]));
  }, []);

  const triggerAbility = useCallback(async (name) => {
    if (phase !== PHASE.INFILTRATE) {
      showNotif('ONLY IN INFILTRATE PHASE!');
      return;
    }
    if (usedAbilities.has(name)) return;

    const isRepair = name === 'repair';

    // Optimistic mark for non-repair abilities
    if (!isRepair) markUsed(name);

    fireAnimation(name, 'outgoing');
    showNotif(ABILITY_EFFECTS[name]?.[lang] ?? ABILITY_EFFECTS[name]?.en ?? name.toUpperCase());

    try {
      const res = await api.useAbility(arenaID, playerID, name);
      if (isRepair) {
        if (res.ok) {
          markUsed(name);
        } else {
          const text = await res.text();
          showNotif(`REPAIR: ${text.trim() || 'window expired'}`);
        }
      }
    } catch (err) {
      console.error('[ability]', err);
    }
  }, [phase, usedAbilities, arenaID, playerID, lang, fireAnimation, showNotif, markUsed]);

  return { usedAbilities, triggerAbility };
}
