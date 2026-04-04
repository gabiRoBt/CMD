import { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import { useTerminal }  from '../../hooks/useTerminal';
import { useDraggable } from '../../hooks/useDraggable';
import { useScramble  } from '../../hooks/useScramble';
import { useRocket    } from '../../hooks/useRocket';

export const TerminalWindow = forwardRef(function TerminalWindow(
  { arenaID, playerID, phase, t, hidden },
  ref,
) {
  const bodyRef     = useRef(null);
  const internalRef = useRef(null);  // always points to the real DOM node

  const { wsRef }                            = useTerminal(bodyRef, { arenaID, playerID, phase });
  useDraggable(internalRef, '#term-drag-handle', '.resize-hint');
  const { activateScramble, cancelScramble } = useScramble(wsRef);
  const { activateRocket,   cancelRocket   } = useRocket(wsRef);

  // Cancel whichever debuff is currently active (called by repair)
  const cancelActiveDebuff = useCallback(() => {
    cancelScramble();
    cancelRocket();
  }, [cancelScramble, cancelRocket]);

  // Expose DOM access + ability controls to parent (Arena.jsx) via ref
  useImperativeHandle(ref, () => ({
    get current()          { return internalRef.current; },
    getBoundingClientRect: () => internalRef.current?.getBoundingClientRect(),
    activateScramble,
    activateRocket,
    cancelActiveDebuff,
  }));

  const isEnemy = phase === 'infiltrate';

  return (
    <div
      id="terminal-win"
      ref={internalRef}
      style={{ display: hidden ? 'none' : 'flex' }}
    >
      <div className="term-bubble-tail-left"  style={{ display: isEnemy ? 'none'  : 'block' }}/>
      <div className="term-bubble-tail-right" style={{ display: isEnemy ? 'block' : 'none'  }}/>

      <div className="term-titlebar" id="term-drag-handle">
        <div className="term-btns">
          <span className="term-btn"/>
          <span className="term-btn"/>
          <span className="term-btn" style={{ background: '#4A8C42' }}/>
        </div>
        <span>{t.termTitle}</span>
        <span className="resize-hint" title="Drag corner to resize">⤢</span>
      </div>

      <div
        id="term-body"
        ref={bodyRef}
        style={{ flex: 1, padding: 4, overflow: 'hidden', background: 'rgba(0,0,0,0.85)' }}
      />
    </div>
  );
});
