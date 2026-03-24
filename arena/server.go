package arena

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true }, // Relaxat pentru dev
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Server este HTTP + WebSocket server-ul jocului
type Server struct {
	manager  *Manager
	hub      *Hub
	serverIP string
}

func NewServer(manager *Manager, hub *Hub) *Server {
	ip := os.Getenv("SERVER_IP")
	if ip == "" {
		ip = "127.0.0.1"
	}
	return &Server{manager: manager, hub: hub, serverIP: ip}
}

// Start pornește HTTP server-ul pe portul dat
func (s *Server) Start(port int) error {
	mux := http.NewServeMux()

	// REST API
	mux.HandleFunc("/api/arenas", s.handleArenas)
	mux.HandleFunc("/api/arena/create", s.handleCreateArena)
	mux.HandleFunc("/api/arena/join", s.handleJoinArena)
	mux.HandleFunc("/api/arena/ready", s.handleSetReady)

	// WebSocket
	mux.HandleFunc("/ws", s.handleWS)

	// Frontend static
	mux.HandleFunc("/", s.handleStatic)

	log.Printf("[Server] Pornit pe :%d", port)
	return http.ListenAndServe(fmt.Sprintf(":%d", port), mux)
}

// ── REST Handlers ──────────────────────────────────────────────────────────────

func (s *Server) handleArenas(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", 405)
		return
	}
	views := s.manager.ListArenas()
	writeJSON(w, views)
}

func (s *Server) handleCreateArena(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", 405)
		return
	}
	var req struct {
		PlayerID string `json:"player_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID == "" {
		http.Error(w, "player_id lipsește", 400)
		return
	}

	arena, err := s.manager.CreateArena(req.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	// Broadcast lista actualizată tuturor
	s.broadcastArenaList()

	writeJSON(w, map[string]string{
		"arena_id":  arena.ID,
		"player_id": req.PlayerID,
		"role":      string(RoleHost),
	})
}

func (s *Server) handleJoinArena(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", 405)
		return
	}
	var req struct {
		ArenaID  string `json:"arena_id"`
		PlayerID string `json:"player_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "JSON invalid", 400)
		return
	}

	_, err := s.manager.JoinArena(req.ArenaID, req.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	s.broadcastArenaList()
	writeJSON(w, map[string]string{
		"arena_id":  req.ArenaID,
		"player_id": req.PlayerID,
		"role":      string(RoleGuest),
	})
}

func (s *Server) handleSetReady(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", 405)
		return
	}
	var req struct {
		ArenaID  string `json:"arena_id"`
		PlayerID string `json:"player_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "JSON invalid", 400)
		return
	}

	arena, err := s.manager.SetReady(req.ArenaID, req.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	// Dacă ambii sunt ready și containerele au pornit, notificăm jucătorii
	if arena.Phase == PhaseSetup {
		s.notifyGameStart(arena)

		// Watchdog pentru câștigător
		s.manager.WatchForWinner(arena, func(winner *Player) {
			s.notifyGameOver(arena, winner)
		})

		// Timer pentru tranziția Setup → Infiltrate
		go s.watchPhaseTransition(arena)
	}

	s.broadcastArenaList()
	writeJSON(w, map[string]string{"status": "ok", "phase": string(arena.Phase)})
}

// ── WebSocket Handler ──────────────────────────────────────────────────────────

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	playerID := r.URL.Query().Get("player_id")
	if playerID == "" {
		http.Error(w, "player_id lipsește din query", 400)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Eroare upgrade: %v", err)
		return
	}

	client := &Client{
		conn:     conn,
		send:     make(chan []byte, 64),
		playerID: playerID,
	}

	s.hub.register <- client

	// Trimitem imediat lista de arene la conectare
	go func() {
		time.Sleep(100 * time.Millisecond) // mică pauză să se înregistreze
		views := s.manager.ListArenas()
		s.hub.SendToPlayer(playerID, WSEvent{Type: EventArenaList, Payload: views})
	}()

	go client.WritePump()
	client.ReadPump(s.hub, nil) // blocking
}

// ── Static frontend ────────────────────────────────────────────────────────────

func (s *Server) handleStatic(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/index.html")
}

// ── Notificări interne ─────────────────────────────────────────────────────────

func (s *Server) notifyGameStart(a *Arena) {
	hostCmd := fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", s.serverIP, a.Host.SSHPort)
	guestCmd := fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", s.serverIP, a.Guest.SSHPort)

	s.hub.SendToPlayer(a.Host.ID, WSEvent{
		Type: EventGameStart,
		Payload: GameStartPayload{
			ArenaID:    a.ID,
			SSHCommand: hostCmd,
			Role:       string(RoleHost),
			Phase:      string(PhaseSetup),
			SetupSecs:  int(a.SetupDuration.Seconds()),
		},
	})

	s.hub.SendToPlayer(a.Guest.ID, WSEvent{
		Type: EventGameStart,
		Payload: GameStartPayload{
			ArenaID:    a.ID,
			SSHCommand: guestCmd,
			Role:       string(RoleGuest),
			Phase:      string(PhaseSetup),
			SetupSecs:  int(a.SetupDuration.Seconds()),
		},
	})
}

// watchPhaseTransition așteaptă tranziția Setup→Infiltrate și notifică jucătorii
// cu porturile SSH INVERSATE (acum atacă containerul adversarului)
func (s *Server) watchPhaseTransition(a *Arena) {
	// Așteptăm sfârșitul Setup-ului
	time.Sleep(a.SetupDuration + 500*time.Millisecond)

	if a.Phase != PhaseInfiltrate {
		return
	}

	// Host atacă containerul Guest și invers
	hostAttackCmd := fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", s.serverIP, a.Guest.SSHPort)
	guestAttackCmd := fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", s.serverIP, a.Host.SSHPort)

	s.hub.SendToPlayer(a.Host.ID, WSEvent{
		Type: EventPhaseChange,
		Payload: PhaseChangePayload{
			ArenaID:    a.ID,
			Phase:      string(PhaseInfiltrate),
			SSHCommand: hostAttackCmd,
			MessageRO:  "⚔️ Setup terminat! Acum atacați containerul adversarului.",
		},
	})

	s.hub.SendToPlayer(a.Guest.ID, WSEvent{
		Type: EventPhaseChange,
		Payload: PhaseChangePayload{
			ArenaID:    a.ID,
			Phase:      string(PhaseInfiltrate),
			SSHCommand: guestAttackCmd,
			MessageRO:  "⚔️ Setup terminat! Acum atacați containerul adversarului.",
		},
	})

	log.Printf("[Arena %s] Jucătorii notificați de Infiltrate", a.ID)
}

func (s *Server) notifyGameStart(a *Arena) {
	hostCmd := fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", s.serverIP, a.Host.SSHPort)
	guestCmd := fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", s.serverIP, a.Guest.SSHPort)

	s.hub.SendToPlayer(a.Host.ID, WSEvent{
		Type: EventGameStart,
		Payload: GameStartPayload{
			ArenaID:    a.ID,
			SSHCommand: hostCmd,
			Role:       string(RoleHost),
			Phase:      string(PhaseSetup),
			SetupSecs:  int(a.SetupDuration.Seconds()),
			PrivateKey: a.Host.Keys.PrivateKeyPEM, // ← ADAUGĂ ASTA
		},
	})

	s.hub.SendToPlayer(a.Guest.ID, WSEvent{
		Type: EventGameStart,
		Payload: GameStartPayload{
			ArenaID:    a.ID,
			SSHCommand: guestCmd,
			Role:       string(RoleGuest),
			Phase:      string(PhaseSetup),
			SetupSecs:  int(a.SetupDuration.Seconds()),
			PrivateKey: a.Guest.Keys.PrivateKeyPEM, // ← ADAUGĂ ASTA
		},
	})
}

func (s *Server) broadcastArenaList() {
	views := s.manager.ListArenas()
	s.hub.Broadcast(WSEvent{Type: EventArenaList, Payload: views})
}

// ── Helpers ────────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// playerIDFromHeader extrage player_id din header sau query
func playerIDFromHeader(r *http.Request) string {
	if id := r.Header.Get("X-Player-ID"); id != "" {
		return strings.TrimSpace(id)
	}
	return r.URL.Query().Get("player_id")
}
