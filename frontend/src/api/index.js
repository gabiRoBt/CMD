const getToken = () => sessionStorage.getItem('cmd_token');

const authHeader = () => {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}` } : {};
};

// Go's http.Error sends plain text — try JSON first, fall back to text
const parseBody = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text.trim(); }
};

const checkResponse = async (res) => {
  const body = await parseBody(res);
  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem('cmd_token');
      window.dispatchEvent(new Event('auth_expired'));
    }
    const msg = typeof body === 'string' ? body : (body?.message || res.statusText || 'Request failed');
    throw new Error(msg);
  }
  return body;
};

const post = (url, body = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  }).then(checkResponse);

const patch = (url, body = {}) =>
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  }).then(checkResponse);

const get = (url) =>
  fetch(url, {
    method: 'GET',
    headers: { ...authHeader() },
  }).then(checkResponse);

export const api = {
  // Auth
  register:       (username, password) => post('/api/auth/register', { username, password }),
  login:          (username, password) => post('/api/auth/login', { username, password }),
  guest:          (name)               => post('/api/auth/guest', { name }),
  me:             ()                   => get('/api/auth/me'),
  changeUsername: (newUsername)        => patch('/api/auth/username', { new_username: newUsername }),

  // Leaderboard
  leaderboard:    (limit = 20)         => get(`/api/leaderboard?limit=${limit}`),

  // Arena
  arenas:         ()                               => get('/api/arenas'),
  myArenaStatus:  ()                               => get('/api/arena/my_status'),
  createArena:    (name, type)                     => post('/api/arena/create', { name, type }),
  joinArena:      (arenaID)                        => post('/api/arena/join',   { arena_id: arenaID }),
  setReady:       (arenaID, playerID)              => post('/api/arena/ready',  { arena_id: arenaID, player_id: playerID }),
  leaveArena:     (arenaID, playerID)              => post('/api/arena/leave',  { arena_id: arenaID, player_id: playerID }),
  useAbility:     (arenaID, playerID, ability)     => post('/api/ability', { arena_id: arenaID, player_id: playerID, ability }),
};
