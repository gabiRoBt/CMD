/**
 * Antenna attachment points as fractions of the base-container's rendered dimensions.
 * Used to compute the screen-space endpoint for the animated connection line.
 * x=0.5 is horizontal centre; y is measured from the top of the container.
 */
export const ANTENNA_FRAC = {
  'skin-dev-mode':  { x: 0.48,  y: 0.30 },
  'skin-classic':   { x: 0.50,  y: 0.12 },
  'skin-cyberpunk': { x: 0.495, y: 0.04 },
  'skin-wasteland': { x: 0.50,  y: 0.10 },
  'skin-jungle':    { x: 0.50,  y: 0.063 },
};

export const SKINS = [
  { value: 'skin-classic',   label: 'SKIN: SIBERIA'   },
  { value: 'skin-wasteland', label: 'SKIN: WASTELAND'  },
  { value: 'skin-cyberpunk', label: 'SKIN: RETRO'      },
  { value: 'skin-jungle',    label: 'SKIN: JUNGLE'     },
  { value: 'skin-dev-mode',  label: 'SKIN: DEV MODE'   },
];
