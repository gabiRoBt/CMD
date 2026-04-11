import { AbilityPill } from '../shared/AbilityPill';
import { useEffect } from 'react';
import { sounds } from '../../utils/sounds';

// ── PhaseBar ──────────────────────────────────────────────────────────────────

export function PhaseBar({ playerID, phase, t }) {
  const isInfil = phase === 'infiltrate';
  return (
    <div id="phase-bar">
      <span className="phase-label">{playerID ?? '—'}</span>
      <span id="phase-name" style={{ color: isInfil ? '#C0704A' : '#4A8C42' }}>
        {isInfil ? t.phaseInfil : t.phaseSetup}
      </span>
      <span className="phase-nuke">nuke: /bin/nuke_system</span>
    </div>
  );
}

// ── Notification ──────────────────────────────────────────────────────────────

export function Notification({ show, msg }) {
  return <div id="notif" className={show ? 'show' : ''}>{msg}</div>;
}

// ── GameOverOverlay ───────────────────────────────────────────────────────────

export function GameOverOverlay({ info, t, onReturn, redirectSecs }) {
  useEffect(() => {
    if (info) {
      if (info.draw) sounds.draw();
      else if (info.won) sounds.win();
      else sounds.lose();
    }
  }, [info]);

  if (!info) return null;

  const titleClass = info.draw ? 'draw' : info.won ? 'won' : 'lost';
  const title = info.draw ? t.drawTitle : info.won ? t.winTitle : t.loseTitle;
  const sub = info.draw ? t.subDraw : info.won ? t.subWin : t.subLose;

  return (
    <div id="winner-overlay" className="show" style={{ display: 'flex' }}>
      <div className={`winner-title ${titleClass}`}>{title}</div>
      <div className="winner-sub">{sub}</div>
      <button
        className="btn btn-green"
        style={{ width: 'auto', padding: '.6rem 2rem' }}
        onClick={onReturn}
      >
        {t.btnRestart} ({redirectSecs}s)
      </button>
    </div>
  );
}

// ── ArenaFooter ───────────────────────────────────────────────────────────────

export function ArenaFooter({ arenaID, role, phase, abilities, usedAbilities, lang, t, onUseAbility }) {
  return (
    <footer id="arena-footer">
      <div className="footer-left">
        <span className="footer-tag">{t.footerArena}</span>
        <span className="footer-id">{arenaID ?? '—'}</span>
      </div>

      <div id="pouch">
        {abilities.length === 0 ? (
          <span className="pouch-empty-msg">
            {phase === 'setup' ? t.pouchHint : t.pouchEmpty}
          </span>
        ) : (
          abilities.map(name => (
            <AbilityPill
              key={name}
              name={name}
              used={usedAbilities.has(name)}
              lang={lang}
              onClick={() => onUseAbility(name)}
            />
          ))
        )}
      </div>

      <div className="footer-right">
        <span className="footer-tag">{t.footerRole}</span>
        <span className="footer-role" style={{ color: role === 'host' ? '#4A8C42' : '#C0704A' }}>
          {role?.toUpperCase() ?? '—'}
        </span>
      </div>
    </footer>
  );
}
