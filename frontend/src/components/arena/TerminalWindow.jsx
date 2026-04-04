import { forwardRef, useRef } from 'react';
import { useTerminal }  from '../../hooks/useTerminal';
import { useDraggable } from '../../hooks/useDraggable';

export const TerminalWindow = forwardRef(function TerminalWindow(
  { arenaID, playerID, phase, t, hidden },
  ref,
) {
  const bodyRef     = useRef(null);
  const internalRef = useRef(null);
  const winRef      = ref ?? internalRef;

  useTerminal(bodyRef, { arenaID, playerID, phase });
  useDraggable(winRef, '#term-drag-handle', '.resize-hint');

  const isEnemy = phase === 'infiltrate';

  return (
    <div
      id="terminal-win"
      ref={winRef}
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
