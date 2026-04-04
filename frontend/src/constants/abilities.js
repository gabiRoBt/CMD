/** @type {Record<string, { icon: string, name: string, color: string }>} */
export const ABILITY_DEFS = {
  scramble: { icon: '🌀', name: 'SCRAMBLE', color: '#C0704A' },
  repair:   { icon: '🔧', name: 'REPAIR',   color: '#4A8C42' },
  rocket:   { icon: '🚀', name: 'ROCKET',   color: '#C0A050' },
  sonar:    { icon: '📡', name: 'SONAR',    color: '#5A9CB0' },
};

/** Localised effect descriptions shown in the notification bar. */
export const ABILITY_EFFECTS = {
  scramble: { ro: 'COMENZI INAMIC AMESTECATE  −20 HP', en: 'ENEMY COMMANDS SCRAMBLED  −20 HP' },
  repair:   { ro: 'REPARAȚIE ACTIVATĂ  +15 HP',         en: 'REPAIR KIT ACTIVATED  +15 HP'    },
  rocket:   { ro: 'INPUT INAMIC BLOCAT — 10s  −25 HP',  en: 'ENEMY INPUT LOCKED — 10s  −25 HP' },
  sonar:    { ro: 'DIRECTOARE GOALE ȘTERSE  −15 HP',    en: 'EMPTY FOLDERS DELETED  −15 HP'   },
};
