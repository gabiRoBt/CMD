export { BaseSiberia,   SiberiaDecorations  } from './Siberia';
export { BaseRetro,     RetroDecorations    } from './Retro';
export { BaseWasteland, WastelandDecorations } from './Wasteland';
export { BaseDevMode,   DevModeDecorations  } from './DevMode';

import { BaseSiberia   } from './Siberia';
import { BaseRetro     } from './Retro';
import { BaseWasteland } from './Wasteland';
import { BaseDevMode   } from './DevMode';

/** Maps a skin key to its base building component. */
export const SKIN_BASES = {
  'skin-classic':   BaseSiberia,
  'skin-cyberpunk': BaseRetro,
  'skin-wasteland': BaseWasteland,
  'skin-dev-mode':  BaseDevMode,
};
