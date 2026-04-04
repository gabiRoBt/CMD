import { useEffect, useRef, useState } from 'react';
import 'xterm/css/xterm.css';

import { useNotification }   from '../hooks/useNotification';
import { useStrikeCanvas }   from '../hooks/useStrikeCanvas';
import { useConnectionLine } from '../hooks/useConnectionLine';
import { useAbilities }      from '../hooks/useAbilities';

import { ArenaScene }    from './arena/ArenaScene';
import { TerminalWindow } from './arena/TerminalWindow';
import { ArenaFooter, GameOverOverlay, Notification, PhaseBar } from './arena/ArenaUI';

export default function Arena({
  t, lang = 'en',
  arenaID, playerID, role, phase,
  abilities = [],
  skin = 'skin-classic',
  incomingAbility = null,
  onReturnToLobby,
}) {
  const [gameOverInfo, setGameOverInfo] = useState(null);

  const arenaRef      = useRef(null);
  const canvasRef     = useRef(null);
  const lineCanvasRef = useRef(null);
  const termWinRef    = useRef(null);

  const { notif, showNotif }       = useNotification();
  const { fireAnimation }          = useStrikeCanvas(canvasRef, arenaRef);

  useConnectionLine({ lineCanvasRef, termWinRef, skin, phase, gameOver: !!gameOverInfo });

  const { usedAbilities, triggerAbility } = useAbilities({
    arenaID, playerID, phase, lang, fireAnimation, showNotif,
  });

  // Game-over via custom window event dispatched by the WS handler in App
  useEffect(() => {
    const handler = ({ detail: p }) => setGameOverInfo({ won: p.you_won, draw: p.draw ?? false });
    window.addEventListener('gameOver', handler);
    return () => window.removeEventListener('gameOver', handler);
  }, []);

  // Incoming ability: enemy attacked us
  useEffect(() => {
    if (incomingAbility) fireAnimation(incomingAbility.name, 'incoming');
    // id changes on every attack, even repeated ones — intentional dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingAbility?.id]);

  const handleReturn = () => { setGameOverInfo(null); onReturnToLobby?.(); };

  return (
    <div className="arena-wrapper">
      <ArenaScene skin={skin} ref={{ arenaRef, canvasRef }}>
        <PhaseBar playerID={playerID} phase={phase} t={t}/>
        <Notification show={notif.show} msg={notif.msg}/>
        <GameOverOverlay info={gameOverInfo} t={t} onReturn={handleReturn}/>
      </ArenaScene>

      {/* Animated dashed arc: terminal ↔ antenna */}
      <canvas
        ref={lineCanvasRef}
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          zIndex: 199, display: gameOverInfo ? 'none' : 'block',
        }}
      />

      <TerminalWindow
        ref={termWinRef}
        arenaID={arenaID}
        playerID={playerID}
        phase={phase}
        t={t}
        hidden={!!gameOverInfo}
      />

      <ArenaFooter
        arenaID={arenaID}
        role={role}
        phase={phase}
        abilities={abilities}
        usedAbilities={usedAbilities}
        lang={lang}
        t={t}
        onUseAbility={triggerAbility}
      />
    </div>
  );
}
