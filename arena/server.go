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
	mux.HandleFunc("/ws", s.handleWS)
	mux.HandleFunc("/ws/terminal", s.handleWSTerminal)
	mux.HandleFunc("/", s.handleStatic)
	mux.HandleFunc("/api/arena/leave", s.handleLeaveArena)

	log.Printf("[Server] Pornit pe :%d", port)
	return http.ListenAndServe(fmt.Sprintf(":%d", port), mux)
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
		http.Error(w, "Arena nu exista", 404)
		return
	}

	var targetPort int
	if a.Phase == PhaseSetup {
		if playerID == a.Host.ID {
			targetPort = a.Host.SSHPort
		} else {
			targetPort = a.Guest.SSHPort
		}
	} else if a.Phase == PhaseInfiltrate {
		if playerID == a.Host.ID {
			targetPort = a.Guest.SSHPort
		} else {
			targetPort = a.Host.SSHPort
		}
	} else {
		http.Error(w, "Terminal indisponibil in aceasta faza", 403)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Eroare upgrade WS terminal: %v", err)
		return
	}

	targetAddr := fmt.Sprintf("%s:%d", s.serverIP, targetPort)
	log.Printf("[Terminal] %s se conecteaza la %s", playerID, targetAddr)

	masterPrivKey := []byte(s.manager.MasterKeys.PrivateKeyPEM)
	StartSSHProxy(conn, targetAddr, masterPrivKey)
}

func (s *Server) handleArenas(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, s.manager.ListArenas())
}

func (s *Server) handleCreateArena(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", 405)
		return
	}
	var req struct {
		PlayerID string `json:"player_id"` // Nu mai cerem PublicKey!
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PlayerID == "" {
		http.Error(w, "player_id este obligatoriu", 400)
		return
	}
	a, err := s.manager.CreateArena(req.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), 400)
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
		PlayerID string `json:"player_id"` // Nu mai cerem PublicKey!
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
			// Așteptăm 1 secundă ca manager.go să șteargă arena din memorie, apoi reîmprospătăm listele
			time.AfterFunc(1*time.Second, func() {
				s.broadcastArenaList()
			})
		})
		go s.watchPhaseTransition(a)
	}
	s.broadcastArenaList()
	writeJSON(w, map[string]string{"status": "ok", "phase": string(a.Phase)})
}

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
	client := &Client{
		conn:     conn,
		send:     make(chan []byte, 64),
		playerID: playerID,
	}
	s.hub.register <- client
	go func() {
		time.Sleep(100 * time.Millisecond)
		s.hub.SendToPlayer(playerID, WSEvent{
			Type:    EventArenaList,
			Payload: s.manager.ListArenas(),
		})
	}()
	go client.WritePump()
	client.ReadPump(s.hub, nil)
}

func (s *Server) handleStatic(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/index.html")
}

func (s *Server) notifyGameStart(a *Arena) {
	// Trimitem doar faza și portul (opțional), nu mai trimitem comenzi text pentru copy-paste
	s.hub.SendToPlayer(a.Host.ID, WSEvent{
		Type: EventGameStart,
		Payload: GameStartPayload{
			ArenaID:   a.ID,
			Role:      string(RoleHost),
			Phase:     string(PhaseSetup),
			SetupSecs: int(a.SetupDuration.Seconds()),
		},
	})
	s.hub.SendToPlayer(a.Guest.ID, WSEvent{
		Type: EventGameStart,
		Payload: GameStartPayload{
			ArenaID:   a.ID,
			Role:      string(RoleGuest),
			Phase:     string(PhaseSetup),
			SetupSecs: int(a.SetupDuration.Seconds()),
		},
	})
}

func (s *Server) watchPhaseTransition(a *Arena) {
	time.Sleep(a.SetupDuration + 500*time.Millisecond)
	if a.Phase != PhaseInfiltrate {
		return
	}
	s.hub.SendToPlayer(a.Host.ID, WSEvent{
		Type: EventPhaseChange,
		Payload: PhaseChangePayload{
			ArenaID:   a.ID,
			Phase:     string(PhaseInfiltrate),
			MessageRO: "⚔️ Setup terminat! Atacați containerul adversarului.",
		},
	})
	s.hub.SendToPlayer(a.Guest.ID, WSEvent{
		Type: EventPhaseChange,
		Payload: PhaseChangePayload{
			ArenaID:   a.ID,
			Phase:     string(PhaseInfiltrate),
			MessageRO: "⚔️ Setup terminat! Atacați containerul adversarului.",
		},
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
			},
		})
	}
}

func (s *Server) broadcastArenaList() {
	s.hub.Broadcast(WSEvent{Type: EventArenaList, Payload: s.manager.ListArenas()})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
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

	if err := s.manager.LeaveArena(req.ArenaID, req.PlayerID); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	s.broadcastArenaList() // Anunțăm toți jucătorii că arena s-a modificat/șters
	writeJSON(w, map[string]string{"status": "ok"})
}
