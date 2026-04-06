import { useState, useEffect } from 'react';
import { api } from '../api';

export function Leaderboard({ t, currentUsername }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await api.leaderboard(20);
      setEntries(data || []);
    } catch (e) {
      console.error("Leaderboard fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="panel-label" style={{ marginBottom: 0 }}>// TOP OPERATIVES (ELO)</span>
        <button className="btn btn-amber" onClick={fetchLeaderboard} style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '.7rem' }}>
          {t?.btnRefresh || '[ ↻ ]'}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 200 }}>
        {loading ? (
          <div style={{ color: '#4A8C42' }}>Loading intel...</div>
        ) : entries.length === 0 ? (
          <div style={{ color: '#C0A050' }}>No ranked players yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--green-dim)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '4px 0', width: 40 }}>#</th>
                <th>OPERATIVE</th>
                <th>ELO</th>
                <th>W</th>
                <th>L</th>
                <th>D</th>
                <th>WIN%</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr 
                  key={e.username} 
                  style={{ 
                    borderBottom: currentUsername === e.username ? '1px solid var(--green)' : '1px solid var(--border)',
                    borderTop: currentUsername === e.username ? '1px solid var(--green)' : 'none',
                    background: currentUsername === e.username ? 'rgba(0,0,0,0.4)' : 'transparent',
                    color: currentUsername === e.username ? 'var(--green)' : 'var(--text-dim)'
                  }}
                >
                  <td style={{ padding: '6px 0' }}>{e.rank}</td>
                  <td>{e.username}</td>
                  <td style={{ color: 'var(--amber)' }}>{e.elo}</td>
                  <td style={{ color: 'var(--green)' }}>{e.wins}</td>
                  <td style={{ color: 'var(--red)' }}>{e.losses}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{e.draws}</td>
                  <td style={{ color: 'var(--amber-dim)' }}>{e.win_pct?.toFixed(1) || '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
