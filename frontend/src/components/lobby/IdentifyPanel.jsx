import { useState } from 'react';

export function IdentifyPanel({ t, onIdentify }) {
  const [name, setName] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { alert(t.errName); return; }
    onIdentify(trimmed.replace(/\s+/g, '_'));
  };

  return (
    <div className="panel">
      <span className="panel-label">{t.titleLobby}</span>

      <div className="field">
        <label>{t.lblCallsign}</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="ex: ghost_r00t"
          maxLength={24}
        />
      </div>

      <button className="btn btn-green" onClick={submit}>
        {t.btnConnect}
      </button>
    </div>
  );
}
