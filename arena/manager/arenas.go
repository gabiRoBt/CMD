package manager

import (
	"CMD/arena/db"
	"context"
	"fmt"
	"log"
	"strings"
	"time"
)

func (m *Manager) ListArenas() []ArenaView {
	m.mu.RLock()
	defer m.mu.RUnlock()
	views := make([]ArenaView, 0, len(m.arenas))
	for _, a := range m.arenas {
		if a.Phase == PhaseFinished {
			continue // Hide finished arenas from the lobby
		}
		view := ArenaView{
			ID:       a.ID,
			Name:     a.Name,
			Type:     a.Type,
			Phase:    string(a.Phase),
			HostID:   a.Host.ID,
			HasGuest: a.Guest != nil,
		}
		if a.Guest != nil {
			view.GuestID = a.Guest.ID
		}
		views = append(views, view)
	}
	return views
}

func (m *Manager) GetArena(id string) (*Arena, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	a, ok := m.arenas[id]
	return a, ok
}

func (m *Manager) DeleteArena(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.arenas, id)
}

func (m *Manager) CreateArena(hostPlayerID, name, arenaType string, hostUserID int) (*Arena, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		name = hostPlayerID + "'s Arena"
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	// Unicitate: nu permitem două arene active cu același nume (case-insensitive)
	lower := strings.ToLower(name)
	for _, a := range m.arenas {
		if strings.ToLower(a.Name) == lower {
			return nil, fmt.Errorf("arena name already taken")
		}
	}
	m.cancelPlayerLobbiesLocked(hostPlayerID)
	arenaID := generateID("arena")
	a := NewArena(arenaID, hostPlayerID, name, arenaType)
	a.HostUserID = hostUserID
	m.arenas[arenaID] = a
	log.Printf("[Arena %s] '%s' created by %s (type=%s)", arenaID, name, hostPlayerID, arenaType)
	return a, nil
}

func (m *Manager) JoinArena(arenaID, guestPlayerID string, guestUserID int) (*Arena, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.arenas[arenaID]
	if !ok {
		return nil, fmt.Errorf("arena %s not found", arenaID)
	}
	if a.Phase != PhaseWaiting {
		return nil, fmt.Errorf("arena %s no longer accepting players", arenaID)
	}
	if a.Guest != nil {
		return nil, fmt.Errorf("arena %s is full", arenaID)
	}
	if a.Host.ID == guestPlayerID {
		return nil, fmt.Errorf("you cannot join your own arena")
	}
	m.cancelPlayerLobbiesLocked(guestPlayerID)
	a.JoinGuest(guestPlayerID)
	a.GuestUserID = guestUserID
	log.Printf("[Arena %s] %s joined", arenaID, guestPlayerID)
	return a, nil
}

func (m *Manager) SetReady(arenaID, playerID string) (*Arena, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.arenas[arenaID]
	if !ok {
		return nil, fmt.Errorf("arena %s not found", arenaID)
	}
	switch playerID {
	case a.Host.ID:
		a.Host.Ready = true
	case a.Guest.ID:
		a.Guest.Ready = true
	default:
		return nil, fmt.Errorf("player %s not in arena %s", playerID, arenaID)
	}
	if a.BothReady() && a.Phase == PhaseWaiting {
		a.Phase = "starting"
		if err := m.startContainers(a); err != nil {
			a.Phase = PhaseWaiting
			return nil, fmt.Errorf("container startup error: %w", err)
		}
	}
	return a, nil
}

func (m *Manager) cancelPlayerLobbiesLocked(playerID string) {
	for id, a := range m.arenas {
		if a.Host.ID == playerID && a.Phase == PhaseWaiting {
			delete(m.arenas, id)
			log.Printf("[Arena %s] Cancelled — %s entered another arena", id, playerID)
		}
	}
}

// ── Timers ────────────────────────────────────────────────────────────────────

func (m *Manager) runSetupTimer(a *Arena) {
	time.Sleep(a.SetupDuration)
	m.mu.Lock()
	defer m.mu.Unlock()
	if a.Phase == PhaseSetup {
		a.Phase = PhaseInfiltrate
	}
}

// RunAttackTimer triggers onTimeout if no winner is found before AttackDuration.
func (m *Manager) RunAttackTimer(a *Arena, onTimeout func()) {
	go func() {
		time.Sleep(a.AttackDuration)
		if a.Phase == PhaseInfiltrate {
			log.Printf("[Arena %s] Timeout — draw", a.ID)
			a.Phase = PhaseFinished
			a.FinishedAt = time.Now()

			if a.Type == "competitive" && m.dbPool != nil {
				if a.HostUserID > 0 && a.GuestUserID > 0 {
					if err := db.UpdateELODraw(context.Background(), m.dbPool, a.HostUserID, a.GuestUserID); err != nil {
						log.Printf("[ELO] Draw update error: %v", err)
					} else {
						log.Printf("[ELO] Draw updated: %d and %d", a.HostUserID, a.GuestUserID)
					}
				}
			}

			m.cleanup(a)
			onTimeout()
		}
	}()
}

// ── Win condition ─────────────────────────────────────────────────────────────

// WatchForWinner polls every 2 seconds for the nuke_success sentinel file.
func (m *Manager) WatchForWinner(a *Arena, onWin func(winner *Player)) {
	go func() {
		for {
			time.Sleep(2 * time.Second)
			if a.Phase == PhaseFinished {
				return
			}
			if m.checkNukeFile(a.Host.ContainerID) {
				m.resolveWin(a, a.Guest, onWin)
				return
			}
			if m.checkNukeFile(a.Guest.ContainerID) {
				m.resolveWin(a, a.Host, onWin)
				return
			}
		}
	}()
}

func (m *Manager) resolveWin(a *Arena, winner *Player, onWin func(*Player)) {
	a.Phase = PhaseFinished
	a.Winner = winner
	a.FinishedAt = time.Now()
	loser := a.Host
	if winner == a.Host {
		loser = a.Guest
	}
	m.stopContainer(loser.ContainerID)

	if a.Type == "competitive" && m.dbPool != nil {
		winnerUID := a.HostUserID
		loserUID := a.GuestUserID
		if winner == a.Guest {
			winnerUID, loserUID = a.GuestUserID, a.HostUserID
		}
		if winnerUID > 0 && loserUID > 0 {
			if err := db.UpdateELO(context.Background(), m.dbPool, winnerUID, loserUID); err != nil {
				log.Printf("[ELO] Update error: %v", err)
			} else {
				log.Printf("[ELO] Updated: winner=%d loser=%d", winnerUID, loserUID)
			}
		}
	}

	onWin(winner)
	m.cleanup(a)
}
