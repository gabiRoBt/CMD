const getToken = () => localStorage.getItem('cmd_token');

const authHeader = () => {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}` } : {};
};

const json = async (res) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('cmd_token');
      window.dispatchEvent(new Event('auth_expired'));
    }
    throw new Error(data?.message || res.statusText || 'Fetch error');
  }
  return data;
};

const post = (url, body = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });

const patch = (url, body = {}) =>
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });

const get = (url) =>
  fetch(url, {
    method: 'GET',
    headers: { ...authHeader() },
  }).then(json);

export const api = {
  // Auth
  register:       (username, password) => post('/api/auth/register', { username, password }).then(json),
  login:          (username, password) => post('/api/auth/login', { username, password }).then(json),
  guest:          (name)               => post('/api/auth/guest', { name }).then(json),
  me:             ()                   => get('/api/auth/me'),
  changeUsername: (newUsername)        => patch('/api/auth/username', { new_username: newUsername }).then(json),

  // Leaderboard
  leaderboard:    (limit = 20)         => get(`/api/leaderboard?limit=${limit}`),

  // Arena
  arenas:         ()                               => get('/api/arenas'),
  myArenaStatus:  ()                               => get('/api/arena/my_status'),
  createArena:    (name, type)                     => post('/api/arena/create', { name, type }).then(json),
  joinArena:      (arenaID)                        => post('/api/arena/join',   { arena_id: arenaID }).then(json),
  setReady:       (arenaID, playerID)              => post('/api/arena/ready',  { arena_id: arenaID, player_id: playerID }).then(json),
  leaveArena:     (arenaID, playerID)              => post('/api/arena/leave',  { arena_id: arenaID, player_id: playerID }).then(json),
  useAbility:     (arenaID, playerID, ability)     => post('/api/ability', { arena_id: arenaID, player_id: playerID, ability }),
};
