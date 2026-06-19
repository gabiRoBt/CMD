<div align="center">

<img src="frontend/public/CMD-ARENA.png" alt="CMD Arena" width="480" />
<p>A real-time competitive hacking game where two players battle inside live Docker containers — hide your nuclear codes, collect your weapons, and nuke the enemy before they nuke you.</p>

</div>



---



## 🎮 What is CMD Arena?

CMD Arena is a browser-based PvP game built around real Linux shells. When a match starts, each player gets an isolated Debian container with a live bash session accessible directly in the browser.

The match runs in two phases: **SETUP** (3 min 30 sec) to fortify your own system, followed by **INFILTRATE** (3 min) where your terminal switches to the enemy's machine. The first player to find the enemy's secret password and run `/bin/nuke_system <password>` wins.



---



## ⚡ Features



- **Live Docker Shells** — Each player gets a real Debian container (bash, python3, vim, nano, GNU coreutils, find, grep, procps, man-db). No simulation.
- **Terminal in Browser** — xterm.js with WebGL renderer, draggable and resizable window, sub-millisecond input latency via Docker exec proxy (no SSH).
- **Two-Phase Gameplay** — SETUP to hide your codes + collect weapons; INFILTRATE to break the enemy's system.
- **4 Tactical Abilities** — Scramble commands, freeze keyboard, scan the enemy filesystem, or counter an incoming attack.
- **Real-Time Events** — WebSocket hub for instant arena updates, ability animations, game-over broadcasts, and terminal I/O.
- **ELO Ranking System** — Competitive matches update ratings with a K=32 (provisional) / K=16 (established) adaptive system.
- **3-Strike Code Protection** — Deleting your own nuclear codes triggers a strike; 3 strikes = automatic defeat. A background guardian process enforces this even when bypassing shell wrappers.
- **Multilingual** — Full support for EN / RO / FR / ES: in-game terminal messages, MOTD, `cmdhelp` game guide, nuke script output.
- **5 Visual Skins** — SIBERIA, WASTELAND, RETRO, JUNGLE, DEV MODE.
- **Guest Mode** — Play instantly without an account. No ELO impact.
- **Surrender System** — Competitive matches require explicit surrender confirmation to prevent accidental exits.



## 🚀 Quick Start



### Prerequisites

- [Docker](https://www.docker.com/) running locally
- [Go](https://go.dev/) 1.21+
- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) 15 (or auto-started via the npm script)



### Setup

1. **Install dependencies:**

   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

   ```env
   DATABASE_URL=postgres://user:password@localhost:5432/cmd_arena
   JWT_SECRET=your_secret_key_here
   PORT=8080
   ALLOWED_ORIGIN=http://localhost:5173
   ```

3. **Build the arena Docker image and start PostgreSQL:**

   ```bash
   npm run prestart-all
   ```

4. **Start everything (Go backend + Vite dev server + ngrok tunnel):**

   ```bash
   npm run start-all
   ```

   Or for a production build served on port 8080:

   ```bash
   npm run build-all
   ```



> **Note:** `prestart-all` builds the `cmd-arena:latest` Docker image and spins up a `postgres:15` container on `localhost:5432`. The Go server auto-creates the database schema on first run.



## 🎯 How to Play



### Phase 1 — SETUP (3 min 30 sec)

You are on **your own container**. The enemy password lives in `~/nuclearcodes.txt`.

**Hide your codes** before the enemy arrives:
```bash
mv nuclearcodes.txt .hidden_name
cat nuclearcodes.txt | base64 > encoded.txt
tar czf archive.tar.gz nuclearcodes.txt && rm nuclearcodes.txt
```

**Collect weapons** to unlock abilities in the UI footer:
```bash
find ~/ -name "weapon_*.bin" 2>/dev/null
mv ~/path/to/weapon_scramble_*.bin ~/pouch/
```

> ⚠️ **You cannot delete the codes.** A background guardian checks every 3 seconds. Each destruction attempt counts as a strike — 3 strikes means automatic defeat. You may move, copy, rename, base64-encode, or archive them freely. Run `cmdhelp` inside the terminal for the full guide.

### Phase 2 — INFILTRATE (3 min)

Your terminal now connects directly to the **enemy's container**.

Search for their hidden password:
```bash
find / -name "nuclearcodes*" 2>/dev/null
grep -r "nuclear" /home/player/ 2>/dev/null
```

Launch the nuke once you find it:
```bash
/bin/nuke_system <found_password>
```



## 🌀 Abilities

Collect `weapon_*.bin` files during SETUP and move them to `~/pouch/` to unlock the corresponding ability. Activate from the footer bar during INFILTRATE.

| Ability | Icon | Effect | Duration |
|---------|------|--------|----------|
| **SCRAMBLE** | 🌀 | Randomly remaps enemy terminal commands (e.g. `ls` → `rm`). The mapping is written to `.bash_aliases`. | 30 s |
| **ROCKET** | 🚀 | Suspends all enemy bash processes — keyboard completely frozen. | 15 s |
| **SONAR** | 📡 | Broadcasts the enemy's full file tree to their terminal + deletes empty directories. | Instant |
| **REPAIR** | 🔧 | Cancels the last attack received, within a 5-second window. Affects the player using it. | — |

Each ability can only be used once per match. Abilities not collected during SETUP are permanently lost at phase transition.



## 🏆 Ranking System

Competitive arenas (registered users only) use an ELO rating system:

| Condition | K-Factor |
|-----------|----------|
| First 30 games | K = 32 (provisional) |
| After 30 games | K = 16 (established) |

**ELO formula:** `Δ = K × (score − 1 / (1 + 10^((opponentELO − myELO) / 400)))`

- **Starting ELO:** 1000
- **Minimum ELO:** 100 (floor protection)
- **Draw:** Both players receive a 0.5 score adjustment
- **Guest accounts** do not affect or accumulate ELO
- Leaderboard ranks by ELO descending, then wins descending



## 🎨 Visual Skins

| Skin Name | Class ID |
|-----------|----------|
| SIBERIA *(default)* | `skin-classic` |
| WASTELAND | `skin-wasteland` |
| RETRO | `skin-cyberpunk` |
| JUNGLE | `skin-jungle` |
| DEV MODE | `skin-dev-mode` |

Each skin changes the color palette, background music, and antenna position in the arena visualization.



## ⚙️ Configuration

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | HMAC-SHA256 secret for signing JWT tokens (required) |
| `PORT` | HTTP server port (default: `8080`) |
| `ALLOWED_ORIGIN` | WebSocket CORS origin (e.g. `http://localhost:5173`) |



## 🏗️ Architecture

```
CMD Arena
├── Go Backend  (Go 1.25)
│   ├── HTTP API         — auth, arenas, abilities, leaderboard
│   ├── WebSocket Hub    — real-time lobby & game events
│   └── Docker Manager   — container lifecycle, exec proxy, ability execution
│
├── PostgreSQL 15
│   └── users            — username, bcrypt hash, ELO, wins, losses, draws
│
├── React 19 + Vite  (frontend)
│   ├── xterm.js         — terminal emulator (WebGL renderer)
│   ├── Canvas           — ability animations, connection line, end-game cinematic
│   └── Multi-skin UI    — 5 themes, 4 languages, skin-aware music
│
└── Docker Containers  (Debian Bookworm slim)
    ├── RAM: 128 MB  |  CPU: 256 shares  |  Max PIDs: 100
    └── bash, python3, vim, nano, coreutils, findutils, grep, procps, man-db
```

**Terminal proxy:** The `/ws/terminal` WebSocket connects directly to a Docker exec session (`/bin/bash --login`, user `player`, TTY enabled) — no SSH, 32 KB buffer, resize messages as JSON control frames.

**Authentication:** JWT (HS256), 7-day expiry, bcrypt cost 12. Guests get auto-named accounts (`guest_<name>`, `guest_<name>_1`, …) with no ELO.



## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create account (username 3–24 chars, password) |
| `POST` | `/api/auth/login` | — | Login; returns JWT |
| `POST` | `/api/auth/guest` | — | Create temporary guest session |
| `GET` | `/api/auth/me` | JWT | Current user profile + live ELO |
| `PATCH` | `/api/auth/username` | JWT | Change username (registered only) |
| `GET` | `/api/leaderboard?limit=N` | — | Top players by ELO (max 100) |
| `GET` | `/api/arenas` | — | List all active arenas |
| `POST` | `/api/arena/create` | JWT | Create arena (`name`, `type`, `lang`) |
| `POST` | `/api/arena/join` | JWT | Join arena by ID |
| `GET` | `/api/arena/my_status` | JWT | Whether player is in an active match |
| `POST` | `/api/arena/ready` | JWT | Toggle ready; both ready → countdown |
| `POST` | `/api/arena/unready` | JWT | Unready (WAITING phase only) |
| `POST` | `/api/arena/leave` | JWT | Leave arena (WAITING phase only) |
| `POST` | `/api/ability` | JWT | Fire ability on opponent (INFILTRATE only) |
| `WS` | `/ws` | JWT/query | Lobby & game event stream |
| `WS` | `/ws/terminal` | JWT/query | Docker exec terminal proxy |

**WebSocket events:** `arena_list`, `game_start`, `phase_change`, `pouch_result`, `ability_fired`, `game_over`, `error`



## 📦 Requirements



- Go 1.21+
- Node.js 18+
- Docker (daemon running, `cmd-arena:latest` image built)
- PostgreSQL 15
- `JWT_SECRET` environment variable



---

---

---



<div align="center">

<pre>
 _______ _______ ______  _______      ______  __   __     
 |  |  | |_____| |     \ |______      |_____]   \_/       
 |  |  | |     | |_____/ |______      |_____]    |        
                                                      
</pre>
<pre>
  ______ _______ ______  ___  
 |  ____ |_____| |_____]   |  
 |_____| |     | |_____] __|__

</pre>
<pre>
 _______ __   _ ______ 
 |_____| | \  | |     \
 |     | |  \_| |_____/

</pre>
<pre>
  ______ _     _ _____  ______ _     _ _____
 |  ____ |_____|   |   |  ____ |_____|   |  
 |_____| |     | __|__ |_____| |     | __|__
                                            
</pre>
</div>
