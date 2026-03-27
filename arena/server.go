package arena

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

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

func (s *Server) Start(port int) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/arenas", s.handleArenas)
	mux.HandleFunc("/api/arena/create", s.handleCreateArena)
	mux.HandleFunc("/api/arena/join", s.handleJoinArena)
	mux.HandleFunc("/api/arena/ready", s.handleSetReady)
	mux.HandleFunc("/api/arena/leave", s.handleLeaveArena)
	mux.HandleFunc("/api/ability", s.handleAbility)
	mux.HandleFunc("/ws", s.handleWS)
	mux.HandleFunc("/ws/terminal", s.handleWSTerminal)
	mux.HandleFunc("/", s.handleStatic)
	log.Printf("[Server] Pornit pe :%d", port)
	return http.ListenAndServe(fmt.Sprintf(":%d", port), mux)
}

// ── REST ──────────────────────────────────────────────────────────────────────

func (s *Server) handleArenas(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, s.manager.ListArenas())
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
		http.Error(w, "player_id este obligatoriu", 400)
		return
	}
	a, err := s.manager.CreateArena(req.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	s.broadcastArenaList()
	writeJSON(w, map[string]string{"arena_id": a.ID, "role": string(RoleHost)})
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
	writeJSON(w, map[string]string{"arena_id": req.ArenaID, "role": string(RoleGuest)})
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
	a, err := s.manager.SetReady(req.ArenaID, req.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	if a.Phase == PhaseSetup {
		s.notifyGameStart(a)
		s.manager.WatchForWinner(a, func(winner *Player) {
			s.notifyGameOver(a, winner)
			time.AfterFunc(1*time.Second, s.broadcastArenaList)
		})
		go s.watchPhaseTransition(a)
	}

	s.broadcastArenaList()
	writeJSON(w, map[string]string{"status": "ok", "phase": string(a.Phase)})
}

func (s *Server) handleLeaveArena(w http.ResponseWriter, r *http.Request) {
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
	a, ok := s.manager.arenas[req.ArenaID]
	if !ok {
		http.Error(w, "arena nu există", 404)
		return
	}
	if a.Phase != PhaseWaiting {
		http.Error(w, "meciul a început deja", 403)
		return
	}
	if a.Host != nil && a.Host.ID == req.PlayerID {
		delete(s.manager.arenas, req.ArenaID)
	} else if a.Guest != nil && a.Guest.ID == req.PlayerID {
		a.Guest = nil
	} else {
		http.Error(w, "nu ești în această arenă", 403)
		return
	}
	s.broadcastArenaList()
	writeJSON(w, map[string]string{"status": "ok"})
}

func (s *Server) handleAbility(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", 405)
		return
	}
	var req struct {
		ArenaID  string `json:"arena_id"`
		PlayerID string `json:"player_id"`
		Ability  string `json:"ability"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "JSON invalid", 400)
		return
	}
	a, ok := s.manager.arenas[req.ArenaID]
	if !ok {
		http.Error(w, "arena nu există", 404)
		return
	}
	if a.Phase != PhaseInfiltrate {
		http.Error(w, "doar în faza Infiltrate", 403)
		return
	}

	var myPlayer, enemyPlayer *Player
	if a.Host.ID == req.PlayerID {
		myPlayer = a.Host
		enemyPlayer = a.Guest
	} else if a.Guest != nil && a.Guest.ID == req.PlayerID {
		myPlayer = a.Guest
		enemyPlayer = a.Host
	} else {
		http.Error(w, "player nu este în arenă", 403)
		return
	}

	var err error
	if req.Ability == "repair" {
		err = s.manager.ExecuteRepair(myPlayer)
	} else {
		err = s.manager.ExecuteAbility(enemyPlayer.ContainerID, req.Ability, enemyPlayer)
	}
	if err != nil {
		log.Printf("[Ability] %s → %s: %v", req.PlayerID, req.Ability, err)
		http.Error(w, err.Error(), 400)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	playerID := r.URL.Query().Get("player_id")
	if playerID == "" {
		http.Error(w, "player_id lipsește", 400)
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

func (s *Server) handleWSTerminal(w http.ResponseWriter, r *http.Request) {
	arenaID := r.URL.Query().Get("arena_id")
	playerID := r.URL.Query().Get("player_id")
	if arenaID == "" || playerID == "" {
		http.Error(w, "Lipsesc parametrii", 400)
		return
	}

	a, ok := s.manager.arenas[arenaID]
	if !ok {
		http.Error(w, "Arena nu există", 404)
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
		http.Error(w, "Terminal indisponibil în această fază", 403)
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

// ── Notificări ────────────────────────────────────────────────────────────────

func (s *Server) notifyGameStart(a *Arena) {
	for _, p := range []*Player{a.Host, a.Guest} {
		var port int
		if p == a.Host {
			port = a.Host.SSHPort
		} else {
			port = a.Guest.SSHPort
		}
		s.hub.SendToPlayer(p.ID, WSEvent{
			Type: EventGameStart,
			Payload: GameStartPayload{
				ArenaID:    a.ID,
				SSHCommand: s.sshCmd(port),
				Role:       string(p.Role),
				Phase:      string(PhaseSetup),
				SetupSecs:  int(a.SetupDuration.Seconds()),
			},
		})
	}
}

// watchPhaseTransition — validează pouch, notifică Infiltrate, pornește timer de atac.
func (s *Server) watchPhaseTransition(a *Arena) {
	// Așteptăm finalul setup-ului
	time.Sleep(a.SetupDuration + 500*time.Millisecond)
	if a.Phase != PhaseInfiltrate {
		return
	}

	// Validare pouch
	hostAbs := s.manager.ValidatePouch(a.Host.ContainerID, a.HostTokens)
	guestAbs := s.manager.ValidatePouch(a.Guest.ContainerID, a.GuestTokens)
	a.Host.Abilities = hostAbs
	a.Guest.Abilities = guestAbs
	log.Printf("[Arena %s] Pouch host: %v | guest: %v", a.ID, hostAbs, guestAbs)

	// Notificăm tranziția (porturile se inversează)
	s.hub.SendToPlayer(a.Host.ID, WSEvent{
		Type: EventPhaseChange,
		Payload: PhaseChangePayload{
			ArenaID:    a.ID,
			Phase:      string(PhaseInfiltrate),
			SSHCommand: s.sshCmd(a.Guest.SSHPort),
			MessageRO:  "⚔️ Atacați containerul adversarului.",
		},
	})
	s.hub.SendToPlayer(a.Guest.ID, WSEvent{
		Type: EventPhaseChange,
		Payload: PhaseChangePayload{
			ArenaID:    a.ID,
			Phase:      string(PhaseInfiltrate),
			SSHCommand: s.sshCmd(a.Host.SSHPort),
			MessageRO:  "⚔️ Atacați containerul adversarului.",
		},
	})

	// Abilitățile validate
	s.hub.SendToPlayer(a.Host.ID, WSEvent{
		Type:    EventPouchResult,
		Payload: PouchResultPayload{ArenaID: a.ID, Abilities: hostAbs},
	})
	s.hub.SendToPlayer(a.Guest.ID, WSEvent{
		Type:    EventPouchResult,
		Payload: PouchResultPayload{ArenaID: a.ID, Abilities: guestAbs},
	})

	// Pornim timerul de atac — dacă expiră fără câștigător → draw + cleanup automat
	s.manager.RunAttackTimer(a, func() {
		log.Printf("[Arena %s] Timeout — DRAW", a.ID)
		// Notificăm ambii jucători că e remiză
		for _, p := range []*Player{a.Host, a.Guest} {
			s.hub.SendToPlayer(p.ID, WSEvent{
				Type: EventGameOver,
				Payload: GameOverPayload{
					ArenaID:    a.ID,
					WinnerID:   "",
					WinnerRole: "",
					YouWon:     false,
					Draw:       true,
				},
			})
		}
		time.AfterFunc(1*time.Second, s.broadcastArenaList)
	})
}

func (s *Server) notifyGameOver(a *Arena, winner *Player) {
	for _, p := range []*Player{a.Host, a.Guest} {
		s.hub.SendToPlayer(p.ID, WSEvent{
			Type: EventGameOver,
			Payload: GameOverPayload{
				ArenaID:    a.ID,
				WinnerID:   winner.ID,
				WinnerRole: string(winner.Role),
				YouWon:     p.ID == winner.ID,
				Draw:       false,
			},
		})
	}
}

func (s *Server) broadcastArenaList() {
	s.hub.Broadcast(WSEvent{Type: EventArenaList, Payload: s.manager.ListArenas()})
}

func (s *Server) sshCmd(port int) string {
	return fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", s.serverIP, port)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
