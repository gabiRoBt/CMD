import { useState, useRef, useEffect } from 'react';
import { api } from '../api';

export function Auth({
  t,
  onLoginSuccess
}) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup' | 'guest'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userRef = useRef(null);
  const passRef = useRef(null);
  const guestRef = useRef(null);

  useEffect(() => {
    setError(null);
  }, [tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let res;
      if (tab === 'login') {
        res = await api.login(userRef.current.value, passRef.current.value);
      } else if (tab === 'signup') {
        res = await api.register(userRef.current.value, passRef.current.value);
      } else if (tab === 'guest') {
        res = await api.guest(guestRef.current.value);
      }

      if (res && res.token) {
        localStorage.setItem('cmd_token', res.token);
        onLoginSuccess({
          username: res.username,
          elo: res.elo,
          isGuest: res.is_guest
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ width: 380, margin: '40px auto' }}>
      <span className="panel-label">{t.titleLobby || '// IDENTIFICATION'}</span>
      <div>
        <div style={{ display: 'flex', borderBottom: '1px solid #336633', marginBottom: 15 }}>
          <TabButton active={tab === 'login'} onClick={() => setTab('login')}>LOGIN</TabButton>
          <TabButton active={tab === 'signup'} onClick={() => setTab('signup')}>SIGN UP</TabButton>
          <TabButton active={tab === 'guest'} onClick={() => setTab('guest')}>GUEST</TabButton>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(tab === 'login' || tab === 'signup') && (
            <>
              <div className="field">
                <label>USERNAME</label>
                <input ref={userRef} type="text" autoFocus required placeholder="player" maxLength={24} />
              </div>
              <div className="field">
                <label>PASSWORD</label>
                <input ref={passRef} type="password" required placeholder="••••••••" />
              </div>
            </>
          )}

          {tab === 'guest' && (
            <div className="field">
              <label>PREFERRED NAME</label>
              <input ref={guestRef} type="text" autoFocus required placeholder="guest" maxLength={24} />
              <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 8 }}>
                Guest accounts can only play casual arenas and do not have ELO.
              </div>
            </div>
          )}

          {error && <div style={{ color: '#D04040', fontSize: 12 }}>ERROR: {error}</div>}

          <button type="submit" className="btn btn-green" disabled={loading} style={{ marginTop: 10 }}>
            {loading ? 'CONNECTING...' : 'CONNECT TO NETWORK'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? '#1a331a' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #50F050' : '2px solid transparent',
        color: active ? '#50F050' : '#4A8C42',
        padding: '8px 0',
        fontFamily: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
