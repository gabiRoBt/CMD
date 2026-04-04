import { forwardRef } from 'react';
import {
  SKIN_BASES,
  SiberiaDecorations,
  RetroDecorations,
  WastelandDecorations,
  DevModeDecorations,
} from '../../skins';

const SKIN_DECORATIONS = {
  'skin-classic':   SiberiaDecorations,
  'skin-cyberpunk': RetroDecorations,
  'skin-wasteland': WastelandDecorations,
  'skin-dev-mode':  DevModeDecorations,
};

/**
 * The battlefield: sky/ground bands, base buildings, decorations, and the
 * strike canvas used for ability animations.
 *
 * Forwarded refs: arenaRef (outer div), canvasRef (strike canvas).
 */
export const ArenaScene = forwardRef(function ArenaScene(
  { skin, children },
  { arenaRef, canvasRef },
) {
  const Base        = SKIN_BASES[skin]        ?? SKIN_BASES['skin-classic'];
  const Decorations = SKIN_DECORATIONS[skin];

  return (
    <div id="arena" ref={arenaRef}>
      <div className="top-band"/>
      <div className="band-separator"/>
      <div className="bottom-band"/>
      <div className="ground-deco"/>

      {Decorations && <Decorations/>}

      <div className="base-container left-base-pos">  <Base/> </div>
      <div className="base-container right-base-pos"> <Base/> </div>

      <canvas id="strike-canvas" ref={canvasRef}/>

      {children}
    </div>
  );
});
