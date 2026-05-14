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
			ID:        a.ID,
			Name:      a.Name,
			Type:      a.Type,
			Phase:     string(a.Phase),
			HostID:    a.Host.ID,
			HasGuest:  a.Guest != nil,
			HostReady: a.Host.Ready,
		}
		if a.Guest != nil {
			view.GuestID = a.Guest.ID
			view.GuestReady = a.Guest.Ready
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

func (m *Manager) CreateArena(hostPlayerID, name, arenaType, lang string, hostUserID int) (*Arena, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		name = hostPlayerID + "'s Arena"
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	// Cancel old waiting lobbies for THIS player first before checking names
	m.cancelPlayerLobbiesLocked(hostPlayerID)

	// Unicitate: nu permitem două arene active cu același nume (case-insensitive)
	lower := strings.ToLower(name)
	for _, a := range m.arenas {
		if a.Phase != PhaseFinished && strings.ToLower(a.Name) == lower {
			return nil, fmt.Errorf("arena name already taken")
		}
	}

	arenaID := generateID("arena")
	a := NewArena(arenaID, hostPlayerID, name, arenaType, lang)
	a.HostUserID = hostUserID
	m.arenas[arenaID] = a
	log.Printf("[Arena %s] '%s' created by %s (type=%s)", arenaID, name, hostPlayerID, arenaType)
	return a, nil
}

func (m *Manager) JoinArena(arenaID, guestPlayerID, lang string, guestUserID int) (*Arena, error) {
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
	a.JoinGuest(guestPlayerID, lang)
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
	switch {
	case a.Host.ID == playerID:
		a.Host.Ready = true
	case a.Guest != nil && a.Guest.ID == playerID:
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

func (m *Manager) SetUnready(arenaID, playerID string) (*Arena, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.arenas[arenaID]
	if !ok {
		return nil, fmt.Errorf("arena %s not found", arenaID)
	}
	// We can only unready if we are waiting
	if a.Phase != PhaseWaiting {
		return nil, fmt.Errorf("cannot unready when match is starting or running")
	}

	switch {
	case a.Host.ID == playerID:
		a.Host.Ready = false
	case a.Guest != nil && a.Guest.ID == playerID:
		a.Guest.Ready = false
	default:
		return nil, fmt.Errorf("player %s not in arena %s", playerID, arenaID)
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

		// Ensure only one finisher (timer vs WatchForWinner) triggers game_over.
		a.finishOnce.Do(func() {
			m.mu.Lock()
			if a.Phase != PhaseInfiltrate {
				m.mu.Unlock()
				return
			}
			log.Printf("[Arena %s] Timeout — draw", a.ID)
			a.Phase = PhaseFinished
			a.FinishedAt = time.Now()
			m.mu.Unlock()

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
		})
	}()
}

// ── Win condition ─────────────────────────────────────────────────────────────

func (m *Manager) WatchForWinner(a *Arena, onWin func(winner *Player)) {
	go func() {
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		for {
			<-ticker.C

			m.mu.RLock()
			finished := a.Phase == PhaseFinished
			m.mu.RUnlock()
			if finished {
				return
			}

			// Poll both containers concurrently to reduce delay
			type result struct {
				nuked       bool
				surrendered bool
				violated    bool
			}

			hostChan := make(chan result, 1)
			guestChan := make(chan result, 1)

			checkContainer := func(containerID string) result {
				if containerID == "" {
					return result{}
				}
				return result{
					nuked:       m.checkNukeFile(containerID),
					surrendered: m.checkFileExists(containerID, "/tmp/player_surrendered"),
					violated:    m.checkFileExists(containerID, "/tmp/player_violation"),
				}
			}

			go func() { hostChan <- checkContainer(a.Host.ContainerID) }()
			if a.Guest != nil {
				go func() { guestChan <- checkContainer(a.Guest.ContainerID) }()
			} else {
				go func() { guestChan <- result{} }()
			}

			hostRes := <-hostChan
			guestRes := <-guestChan

			// Nuke success = attacker wins (nuke on THEIR container means they got nuked)
			if hostRes.nuked {
				log.Printf("[Arena %s] Host container nuked — Guest wins", a.ID)
				m.resolveWin(a, a.Guest, onWin)
				return
			}
			if guestRes.nuked {
				log.Printf("[Arena %s] Guest container nuked — Host wins", a.ID)
				m.resolveWin(a, a.Host, onWin)
				return
			}

			// Surrender/violation on own container = self loses
			if hostRes.surrendered {
				log.Printf("[Arena %s] Host surrendered — Guest wins", a.ID)
				m.resolveWin(a, a.Guest, onWin)
				return
			}
			if hostRes.violated {
				log.Printf("[Arena %s] Host violated (3 strikes) — Guest wins", a.ID)
				m.resolveWin(a, a.Guest, onWin)
				return
			}
			if guestRes.surrendered {
				log.Printf("[Arena %s] Guest surrendered — Host wins", a.ID)
				m.resolveWin(a, a.Host, onWin)
				return
			}
			if guestRes.violated {
				log.Printf("[Arena %s] Guest violated (3 strikes) — Host wins", a.ID)
				m.resolveWin(a, a.Host, onWin)
				return
			}
		}
	}()
}

func (m *Manager) resolveWin(a *Arena, winner *Player, onWin func(*Player)) {
	// Ensure only one finisher (timer vs WatchForWinner) triggers game_over.
	a.finishOnce.Do(func() {
		m.mu.Lock()
		a.Phase = PhaseFinished
		a.Winner = winner
		a.FinishedAt = time.Now()
		m.mu.Unlock()

		// ELO update (non-blocking)
		if a.Type == "competitive" && m.dbPool != nil {
			winnerUID := a.HostUserID
			loserUID := a.GuestUserID
			if winner == a.Guest {
				winnerUID, loserUID = a.GuestUserID, a.HostUserID
			}
			if winnerUID > 0 && loserUID > 0 {
				go func(wUID, lUID int) {
					if err := db.UpdateELO(context.Background(), m.dbPool, wUID, lUID); err != nil {
						log.Printf("[ELO] Update error: %v", err)
					} else {
						log.Printf("[ELO] Updated: winner=%d loser=%d", wUID, lUID)
					}
				}(winnerUID, loserUID)
			}
		}

		// IMPORTANT: trimitem game_over ÎNAINTE de a opri containere!
		// Altfel stopContainer() blochează 3s și evenimentul ajunge târziu/niciodată.
		onWin(winner)

		// Async cleanup — does not block events
		go m.cleanup(a)
	})
}
