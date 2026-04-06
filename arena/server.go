package arena

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Server wires the HTTP layer to the Manager and Hub.
type Server struct {
	manager  *Manager
	hub      *Hub
	db       *pgxpool.Pool
	serverIP string
}

func NewServer(manager *Manager, hub *Hub, db *pgxpool.Pool) *Server {
	ip := os.Getenv("SERVER_IP")
	if ip == "" {
		ip = "127.0.0.1"
	}
	return &Server{manager: manager, hub: hub, db: db, serverIP: ip}
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
	// We want to pass auth down if possible, but for now we expect the client to wrap it or
	// we handle the token manually. Let's wrap create/join with requireAuth so we have UserID.
	mux.HandleFunc("/api/arena/create", requireAuth(s.db, s.handleCreateArenaAuth))
	mux.HandleFunc("/api/arena/join", requireAuth(s.db, s.handleJoinArenaAuth))
	mux.HandleFunc("/api/arena/my_status", requireAuth(s.db, s.handleMyArenaStatusAuth))
	mux.HandleFunc("/api/arena/ready", s.handleSetReady)
	mux.HandleFunc("/api/arena/leave", s.handleLeaveArena)
	mux.HandleFunc("/api/ability", s.handleAbility)

	mux.HandleFunc("/ws", s.handleWS)
	mux.HandleFunc("/ws/terminal", s.handleWSTerminal)
	mux.HandleFunc("/", s.handleStatic)
	log.Printf("[Server] Started on :%d", port)
	return http.ListenAndServe(fmt.Sprintf(":%d", port), mux)
}

// ── WebSocket — lobby events ──────────────────────────────────────────────────

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	playerID := r.URL.Query().Get("player_id")
	if playerID == "" {
		http.Error(w, "player_id missing", 400)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := &Client{conn: conn, send: make(chan []byte, 64), playerID: playerID}
	s.hub.register <- client
	go func() {
		time.Sleep(100 * time.Millisecond)
		s.hub.SendToPlayer(playerID, WSEvent{Type: EventArenaList, Payload: s.manager.ListArenas()})
	}()
	go client.WritePump()
	client.ReadPump(s.hub, nil)
}

// ── WebSocket — terminal proxy ────────────────────────────────────────────────

func (s *Server) handleWSTerminal(w http.ResponseWriter, r *http.Request) {
	arenaID := r.URL.Query().Get("arena_id")
	playerID := r.URL.Query().Get("player_id")
	if arenaID == "" || playerID == "" {
		http.Error(w, "missing params", 400)
		return
	}
	a, ok := s.manager.arenas[arenaID]
	if !ok {
		http.Error(w, "arena not found", 404)
		return
	}

	var targetPort int
	switch a.Phase {
	case PhaseSetup:
		if playerID == a.Host.ID {
			targetPort = a.Host.SSHPort
		} else {
			targetPort = a.Guest.SSHPort
		}
	case PhaseInfiltrate:
		if playerID == a.Host.ID {
			targetPort = a.Guest.SSHPort
		} else {
			targetPort = a.Host.SSHPort
		}
	default:
		http.Error(w, "terminal unavailable in this phase", 403)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	targetAddr := fmt.Sprintf("%s:%d", s.serverIP, targetPort)
	masterPrivKey := []byte(s.manager.MasterKeys.PrivateKeyPEM)
	log.Printf("[Terminal] %s → %s", playerID, targetAddr)
	StartSSHProxy(conn, targetAddr, masterPrivKey)
}

// ── Static ────────────────────────────────────────────────────────────────────

func (s *Server) handleStatic(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/index.html")
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (s *Server) sshCmd(port int) string {
	return fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", s.serverIP, port)
}

func (s *Server) broadcastArenaList() {
	s.hub.Broadcast(WSEvent{Type: EventArenaList, Payload: s.manager.ListArenas()})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
