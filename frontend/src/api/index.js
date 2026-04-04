const json = (res) => res.json();

const post = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const api = {
  arenas:       ()                        => fetch('/api/arenas').then(json),
  createArena:  (playerID)               => post('/api/arena/create', { player_id: playerID }).then(json),
  joinArena:    (arenaID, playerID)      => post('/api/arena/join',   { arena_id: arenaID, player_id: playerID }).then(json),
  setReady:     (arenaID, playerID)      => post('/api/arena/ready',  { arena_id: arenaID, player_id: playerID }).then(json),
  leaveArena:   (arenaID, playerID)      => post('/api/arena/leave',  { arena_id: arenaID, player_id: playerID }).then(json),
  useAbility:   (arenaID, playerID, ability) =>
    post('/api/ability', { arena_id: arenaID, player_id: playerID, ability }),
};
