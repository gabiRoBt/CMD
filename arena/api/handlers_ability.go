package api

import (
	"CMD/arena/manager"
	"CMD/arena/ws"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// handleAbility processes an ability request during the Infiltrate phase.
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
		http.Error(w, "invalid JSON", 400)
		return
	}

	a, ok := s.manager.GetArena(req.ArenaID)
	if !ok {
		http.Error(w, "arena not found", 404)
		return
	}
	if a.Phase != manager.PhaseInfiltrate {
		http.Error(w, "only in Infiltrate phase", 403)
		return
	}

	myPlayer, enemyPlayer := s.resolvePlayers(a, req.PlayerID)
	if myPlayer == nil {
		http.Error(w, "player not in arena", 403)
		return
	}

	var (
		err           error
		updatedPlayer *manager.Player
	)
	if req.Ability == "repair" {
		err = s.manager.ExecuteRepair(myPlayer)
		updatedPlayer = myPlayer
	} else {
		err = s.manager.ExecuteAbility(enemyPlayer.ContainerID, req.Ability, enemyPlayer)
		updatedPlayer = enemyPlayer
	}
	if err != nil {
		log.Printf("[Ability] %s → %s: %v", req.PlayerID, req.Ability, err)
		http.Error(w, err.Error(), 400)
		return
	}

	s.broadcastAbilityFired(a, updatedPlayer, req.Ability)
	log.Printf("[Ability] %s → %s on %s", req.PlayerID, req.Ability, updatedPlayer.ID)
	writeJSON(w, map[string]interface{}{"status": "ok"})
}

// ── Game lifecycle notifications ──────────────────────────────────────────────

func (s *Server) notifyGameStart(a *manager.Arena) {
	for _, p := range []*manager.Player{a.Host, a.Guest} {
		port := a.Host.SSHPort
		if p == a.Guest {
			port = a.Guest.SSHPort
		}
		s.hub.SendToPlayer(p.ID, ws.WSEvent{
			Type: ws.EventGameStart,
			Payload: ws.GameStartPayload{
				ArenaID:    a.ID,
				SSHCommand: s.sshCmd(port),
				Role:       string(p.Role),
				Phase:      string(manager.PhaseSetup),
				SetupSecs:  int(a.SetupDuration.Seconds()),
			},
		})
	}
}

func (s *Server) watchPhaseTransition(a *manager.Arena) {
	time.Sleep(a.SetupDuration + 500*time.Millisecond)
	if a.Phase != manager.PhaseInfiltrate {
		return
	}

	hostAbs := s.manager.ValidatePouch(a.Host.ContainerID, a.HostTokens)
	guestAbs := s.manager.ValidatePouch(a.Guest.ContainerID, a.GuestTokens)
	a.Host.Abilities = hostAbs
	a.Guest.Abilities = guestAbs
	log.Printf("[Arena %s] Pouch — host: %v | guest: %v", a.ID, hostAbs, guestAbs)

	for _, p := range []*manager.Player{a.Host, a.Guest} {
		enemyPort := a.Guest.SSHPort
		if p == a.Guest {
			enemyPort = a.Host.SSHPort
		}
		abs := hostAbs
		if p == a.Guest {
			abs = guestAbs
		}
		s.hub.SendToPlayer(p.ID, ws.WSEvent{
			Type: ws.EventPhaseChange,
			Payload: ws.PhaseChangePayload{
				ArenaID:    a.ID,
				Phase:      string(manager.PhaseInfiltrate),
				SSHCommand: s.sshCmd(enemyPort),
				MessageRO:  "⚔️ Attack the enemy container.",
			},
		})
		s.hub.SendToPlayer(p.ID, ws.WSEvent{
			Type:    ws.EventPouchResult,
			Payload: ws.PouchResultPayload{ArenaID: a.ID, Abilities: abs},
		})
	}

	s.manager.RunAttackTimer(a, func() {
		log.Printf("[Arena %s] Timeout — DRAW", a.ID)
		for _, p := range []*manager.Player{a.Host, a.Guest} {
			s.hub.SendToPlayer(p.ID, ws.WSEvent{
				Type:    ws.EventGameOver,
				Payload: ws.GameOverPayload{ArenaID: a.ID, YouWon: false, Draw: true},
			})
		}
		time.AfterFunc(1*time.Second, s.broadcastArenaList)
	})
}

func (s *Server) notifyGameOver(a *manager.Arena, winner *manager.Player) {
	for _, p := range []*manager.Player{a.Host, a.Guest} {
		s.hub.SendToPlayer(p.ID, ws.WSEvent{
			Type: ws.EventGameOver,
			Payload: ws.GameOverPayload{
				ArenaID:    a.ID,
				WinnerID:   winner.ID,
				WinnerRole: string(winner.Role),
				YouWon:     p.ID == winner.ID,
				Draw:       false,
			},
		})
	}
}

// ── Internal helpers ──────────────────────────────────────────────────────────

func (s *Server) resolvePlayers(a *manager.Arena, playerID string) (me, enemy *manager.Player) {
	if a.Host.ID == playerID {
		return a.Host, a.Guest
	}
	if a.Guest != nil && a.Guest.ID == playerID {
		return a.Guest, a.Host
	}
	return nil, nil
}

func (s *Server) broadcastAbilityFired(a *manager.Arena, target *manager.Player, ability string) {
	event := ws.WSEvent{
		Type: ws.EventAbilityFired,
		Payload: ws.AbilityFiredPayload{
			ArenaID:  a.ID,
			TargetID: target.ID,
			Ability:  ability,
		},
	}
	for _, p := range []*manager.Player{a.Host, a.Guest} {
		if p != nil {
			s.hub.SendToPlayer(p.ID, event)
		}
	}
}
