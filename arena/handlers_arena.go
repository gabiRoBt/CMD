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

func (s *Server) handleCreateArenaAuth(w http.ResponseWriter, r *http.Request, c *Claims) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", 405)
		return
	}
	var req struct {
		Name string `json:"name"`
		Type string `json:"type"` // "casual" or "competitive"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Name = c.Username + "'s Arena"
		req.Type = "casual"
	}
	if c.IsGuest && req.Type == "competitive" {
		http.Error(w, "guests cannot create competitive arenas", 403)
		return
	}

	a, err := s.manager.CreateArena(c.Username, req.Name, req.Type, c.UserID)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	s.broadcastArenaList()
	writeJSON(w, map[string]string{"arena_id": a.ID, "role": string(RoleHost)})
}

func (s *Server) handleJoinArenaAuth(w http.ResponseWriter, r *http.Request, c *Claims) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", 405)
		return
	}
	var req struct {
		ArenaID string `json:"arena_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", 400)
		return
	}

	// Double check competitive for guests
	if a, ok := s.manager.arenas[req.ArenaID]; ok {
		if a.Type == "competitive" && c.IsGuest {
			http.Error(w, "guests cannot join competitive arenas", 403)
			return
		}
	}

	if _, err := s.manager.JoinArena(req.ArenaID, c.Username, c.UserID); err != nil {
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

func (s *Server) handleMyArenaStatusAuth(w http.ResponseWriter, r *http.Request, c *Claims) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", 405)
		return
	}

	// Caută dacă jucătorul este host sau guest într-o arenă care nu s-a terminat
	for id, a := range s.manager.arenas {
		if a.Phase == PhaseFinished {
			continue
		}
		if a.Host != nil && a.Host.ID == c.Username {
			writeJSON(w, map[string]interface{}{"in_arena": true, "arena_id": id, "role": string(RoleHost)})
			return
		}
		if a.Guest != nil && a.Guest.ID == c.Username {
			writeJSON(w, map[string]interface{}{"in_arena": true, "arena_id": id, "role": string(RoleGuest)})
			return
		}
	}

	writeJSON(w, map[string]interface{}{"in_arena": false})
}
