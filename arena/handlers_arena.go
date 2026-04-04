package arena

import (
	"encoding/json"
	"net/http"
	"time"
)

// ── Arena lifecycle REST handlers ─────────────────────────────────────────────

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
		http.Error(w, "player_id required", 400)
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
		http.Error(w, "invalid JSON", 400)
		return
	}
	if _, err := s.manager.JoinArena(req.ArenaID, req.PlayerID); err != nil {
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
		http.Error(w, "invalid JSON", 400)
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
		http.Error(w, "invalid JSON", 400)
		return
	}
	a, ok := s.manager.arenas[req.ArenaID]
	if !ok {
		http.Error(w, "arena not found", 404)
		return
	}
	if a.Phase != PhaseWaiting {
		http.Error(w, "match already started", 403)
		return
	}
	if a.Host != nil && a.Host.ID == req.PlayerID {
		delete(s.manager.arenas, req.ArenaID)
	} else if a.Guest != nil && a.Guest.ID == req.PlayerID {
		a.Guest = nil
	} else {
		http.Error(w, "not in this arena", 403)
		return
	}
	s.broadcastArenaList()
	writeJSON(w, map[string]string{"status": "ok"})
}
