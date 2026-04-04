import { ABILITY_DEFS, ABILITY_EFFECTS } from '../../constants/abilities';

export function AbilityPill({ name, used, lang, onClick }) {
  const def = ABILITY_DEFS[name] ?? { icon: '?', name: name.toUpperCase(), color: '#666' };
  const tip = used
    ? 'Already used'
    : (ABILITY_EFFECTS[name]?.[lang] ?? def.name);

  return (
    <div
      className={`ability-pill${used ? ' used' : ''}`}
      style={{ '--ab-color': used ? '#2a2a2a' : def.color }}
      title={tip}
      onClick={used ? undefined : onClick}
    >
      <div className="ab-cd-progress" style={{ width: 0 }}/>
      <span className="ab-icon">{used ? '—' : def.icon}</span>
      <span className="ab-name">{def.name}</span>
      {used
        ? <span className="ab-used-tag">USED</span>
        : <span className="ab-key">[use]</span>
      }
    </div>
  );
}
