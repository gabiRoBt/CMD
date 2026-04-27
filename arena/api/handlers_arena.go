package api

import (
	"CMD/arena/auth"
	"CMD/arena/manager"
	"CMD/arena/ws"
	"encoding/json"
	"net/http"
	"time"
)

// ── Arena lifecycle REST handlers ─────────────────────────────────────────────

func (s *Server) handleArenas(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, s.manager.ListArenas())
}

func (s *Server) handleCreateArenaAuth(w http.ResponseWriter, r *http.Request, c *auth.Claims) {
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
		http.Error(w, err.Error(), 400)
		return
	}
	s.broadcastArenaList()
	writeJSON(w, map[string]string{"arena_id": a.ID, "arena_name": a.Name, "role": string(manager.RoleHost)})
}

func (s *Server) handleJoinArenaAuth(w http.ResponseWriter, r *http.Request, c *auth.Claims) {
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

	if a, ok := s.manager.GetArena(req.ArenaID); ok {
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
	writeJSON(w, map[string]string{"arena_id": req.ArenaID, "role": string(manager.RoleGuest)})
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
	if a.Phase == manager.PhaseCountdown {
		s.notifyGameStart(a)
		s.manager.WatchForWinner(a, func(winner *manager.Player) {
			s.notifyGameOver(a, winner)
			time.AfterFunc(1*time.Second, s.broadcastArenaList)
		})
		go func() {
			time.Sleep(6 * time.Second)
			s.manager.StartSetupTimer(a)
			event := ws.WSEvent{
				Type:    ws.EventPhaseChange,
				Payload: map[string]interface{}{"phase": manager.PhaseSetup},
			}
			s.hub.SendToPlayer(a.Host.ID, event)
			if a.Guest != nil {
				s.hub.SendToPlayer(a.Guest.ID, event)
			}
			s.watchPhaseTransition(a)
		}()
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
	a, ok := s.manager.GetArena(req.ArenaID)
	if !ok {
		http.Error(w, "arena not found", 404)
		return
	}
	if a.Phase != manager.PhaseWaiting {
		http.Error(w, "match already started", 403)
		return
	}
	if a.Host != nil && a.Host.ID == req.PlayerID {
		if a.Guest != nil {
			s.hub.SendToPlayer(a.Guest.ID, ws.WSEvent{Type: "kicked", Payload: nil})
		}
		s.manager.DeleteArena(req.ArenaID)
	} else if a.Guest != nil && a.Guest.ID == req.PlayerID {
		a.Guest = nil
	} else {
		http.Error(w, "not in this arena", 403)
		return
	}
	s.broadcastArenaList()
	writeJSON(w, map[string]string{"status": "ok"})
}

func (s *Server) handleMyArenaStatusAuth(w http.ResponseWriter, r *http.Request, c *auth.Claims) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", 405)
		return
	}

	// Căutăm arena extinsă, nu doar view-ul
	for _, av := range s.manager.ListArenas() {
		a, ok := s.manager.GetArena(av.ID)
		if !ok || a.Phase == manager.PhaseFinished {
			continue
		}

		role := ""
		var me *manager.Player
		if a.Host.ID == c.Username {
			role = string(manager.RoleHost)
			me = a.Host
		} else if a.Guest != nil && a.Guest.ID == c.Username {
			role = string(manager.RoleGuest)
			me = a.Guest
		}

		if role != "" {
			resp := map[string]interface{}{
				"in_arena": true,
				"arena_id": a.ID,
				"role":     role,
				"phase":    string(a.Phase),
			}

			if a.Phase == manager.PhaseSetup {
				resp["time_left"] = int(a.SetupDuration.Seconds() - time.Since(a.StartedAt).Seconds())
			} else if a.Phase == manager.PhaseInfiltrate {
				resp["time_left"] = int(a.AttackDuration.Seconds() - (time.Since(a.StartedAt).Seconds() - a.SetupDuration.Seconds()))
				resp["abilities"] = me.Abilities
			}

			writeJSON(w, resp)
			return
		}
	}
	writeJSON(w, map[string]interface{}{"in_arena": false})
}
