/** @type {Record<string, { icon: string, name: string, color: string }>} */
export const ABILITY_DEFS = {
  scramble: { icon: '🌀', name: 'SCRAMBLE', color: '#C0704A' },
  repair:   { icon: '🔧', name: 'REPAIR',   color: '#4A8C42' },
  rocket:   { icon: '🚀', name: 'ROCKET',   color: '#C0A050' },
  sonar:    { icon: '📡', name: 'SONAR',    color: '#5A9CB0' },
};

/** Localised effect descriptions shown in the notification bar. */
export const ABILITY_EFFECTS = {
  scramble: {
    ro: 'COMENZI INAMIC AMESTECATE',
    en: 'ENEMY COMMANDS SCRAMBLED',
    es: 'COMANDOS ENEMIGOS MEZCLADOS',
    fr: 'COMMANDES ENNEMIES BROUILLÉES'
  },
  repair: {
    ro: 'REPARAȚIE ACTIVATĂ',
    en: 'REPAIR KIT ACTIVATED',
    es: 'KIT DE REPARACIÓN ACTIVADO',
    fr: 'KIT DE RÉPARATION ACTIVÉ'
  },
  rocket: {
    ro: 'INPUT INAMIC BLOCAT',
    en: 'ENEMY INPUT LOCKED',
    es: 'ENTRADA ENEMIGA BLOQUEADA',
    fr: 'SAISIE ENNEMIE BLOQUÉE'
  },
  sonar: {
    ro: 'DIRECTOARE GOALE ȘTERSE',
    en: 'EMPTY FOLDERS DELETED',
    es: 'CARPETAS VACÍAS ELIMINADAS',
    fr: 'DOSSIERS VIDES SUPPRIMÉS'
  },
};
