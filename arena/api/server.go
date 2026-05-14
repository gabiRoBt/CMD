package api

import (
	"CMD/arena/auth"
	"CMD/arena/docker"
	"CMD/arena/manager"
	"CMD/arena/ws"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		// În producție ar trebui restricționat la origin-ul frontend-ului tău.
		// Permitem localhost și orice setare specificată în ALLOWED_ORIGIN.
		allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
		if allowedOrigin != "" && origin == allowedOrigin {
			return true
		}
		// Fallback for local development
		return true // or a better check if required
	},
	ReadBufferSize:  16 * 1024,
	WriteBufferSize: 16 * 1024,
}

// Server wires the HTTP layer to the Manager and Hub.
type Server struct {
	manager *manager.Manager
	hub     *ws.Hub
	db      *pgxpool.Pool
}

func NewServer(mgr *manager.Manager, hub *ws.Hub, db *pgxpool.Pool) *Server {
	return &Server{manager: mgr, hub: hub, db: db}
}

func (s *Server) Start(port int) error {
	mux := http.NewServeMux()

	// Auth & Leaderboard
	mux.HandleFunc("/api/auth/register", handleRegister(s.db))
	mux.HandleFunc("/api/auth/login", handleLogin(s.db))
	mux.HandleFunc("/api/auth/guest", handleGuest(s.db))
	mux.HandleFunc("/api/auth/me", handleMe(s.db))
	mux.HandleFunc("/api/auth/username", handleChangeUsername(s.db))
	mux.HandleFunc("/api/leaderboard", handleLeaderboard(s.db))

	mux.HandleFunc("/api/arenas", s.handleArenas)
	mux.HandleFunc("/api/arena/create", requireAuth(s.db, s.handleCreateArenaAuth))
	mux.HandleFunc("/api/arena/join", requireAuth(s.db, s.handleJoinArenaAuth))
	mux.HandleFunc("/api/arena/my_status", requireAuth(s.db, s.handleMyArenaStatusAuth))
	mux.HandleFunc("/api/arena/ready", s.handleSetReady)
	mux.HandleFunc("/api/arena/unready", s.handleSetUnready)
	mux.HandleFunc("/api/arena/leave", s.handleLeaveArena)
	mux.HandleFunc("/api/ability", s.handleAbility)

	mux.HandleFunc("/ws", s.handleWS)
	mux.HandleFunc("/ws/terminal", s.handleWSTerminal)
	mux.Handle("/", newSPAHandler())
	log.Printf("[Server] Started on :%d", port)
	return http.ListenAndServe(fmt.Sprintf(":%d", port), mux)
}

// ── WebSocket — lobby events ──────────────────────────────────────────────────

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	// Authenticate via JWT token in query parameter
	tokenStr := r.URL.Query().Get("token")
	playerID := r.URL.Query().Get("player_id")
	if tokenStr != "" {
		claims, err := auth.ValidateJWT(tokenStr)
		if err != nil {
			http.Error(w, "invalid token", 401)
			return
		}
		playerID = claims.Username
	}
	if playerID == "" {
		http.Error(w, "player_id missing", 400)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := ws.NewClient(conn, playerID)
	s.hub.Register <- client
	s.hub.SendToPlayer(playerID, ws.WSEvent{Type: ws.EventArenaList, Payload: s.manager.ListArenas()})
	go client.WritePump()
	client.ReadPump(s.hub, nil)
}

// ── WebSocket — terminal proxy via Docker Exec ────────────────────────────────

func (s *Server) handleWSTerminal(w http.ResponseWriter, r *http.Request) {
	arenaID := r.URL.Query().Get("arena_id")
	playerID := r.URL.Query().Get("player_id")

	// Authenticate via JWT token in query parameter
	if tokenStr := r.URL.Query().Get("token"); tokenStr != "" {
		claims, err := auth.ValidateJWT(tokenStr)
		if err != nil {
			http.Error(w, "invalid token", 401)
			return
		}
		playerID = claims.Username
	}

	if arenaID == "" || playerID == "" {
		http.Error(w, "missing params", 400)
		return
	}
	a, ok := s.manager.GetArena(arenaID)
	if !ok {
		http.Error(w, "arena not found", 404)
		return
	}

	// Determină containerul țintă în funcție de fază
	var targetContainerID string
	switch a.Phase {
	case manager.PhaseCountdown, manager.PhaseSetup:
		// Setup: jucătorul e pe containerul propriu
		if playerID == a.Host.ID {
			targetContainerID = a.Host.ContainerID
		} else if a.Guest != nil && playerID == a.Guest.ID {
			targetContainerID = a.Guest.ContainerID
		} else {
			http.Error(w, "player not in arena", 403)
			return
		}
	case manager.PhaseInfiltrate:
		// Infiltrate: jucătorul e pe containerul inamicului
		if a.Guest == nil {
			http.Error(w, "no opponent available", 403)
			return
		}
		if playerID == a.Host.ID {
			targetContainerID = a.Guest.ContainerID
		} else if playerID == a.Guest.ID {
			targetContainerID = a.Host.ContainerID
		} else {
			http.Error(w, "player not in arena", 403)
			return
		}
	default:
		http.Error(w, "terminal unavailable in this phase", 403)
		return
	}

	if targetContainerID == "" {
		http.Error(w, "target container not ready", 503)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	log.Printf("[Terminal] %s → container %s (docker exec)", playerID, targetContainerID[:12])
	docker.StartExecProxy(conn, s.manager.DockerClient(), targetContainerID)
}

// ── Static ────────────────────────────────────────────────────────────────────

// spaHandler servește fișierele statice din directorul static/.
// If file doesn't exist (React Router routes), return index.html (SPA fallback).
type spaHandler struct {
	fs http.Handler
}

func newSPAHandler() spaHandler {
	return spaHandler{fs: http.FileServer(http.Dir("static"))}
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Check if requested file physically exists in static/
	path := "static" + r.URL.Path
	if _, err := os.Stat(path); os.IsNotExist(err) {
		// Fișier inexistent → SPA fallback: trimite index.html
		http.ServeFile(w, r, "static/index.html")
		return
	}
	// Fișier găsit (JS, CSS, assets, favicon etc.) → servit direct
	h.fs.ServeHTTP(w, r)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (s *Server) broadcastArenaList() {
	s.hub.Broadcast(ws.WSEvent{Type: ws.EventArenaList, Payload: s.manager.ListArenas()})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
