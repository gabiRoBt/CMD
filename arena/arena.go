package arena

import "time"

// PlayerRole diferențiază cei doi jucători
type PlayerRole string

const (
	RoleHost  PlayerRole = "host"
	RoleGuest PlayerRole = "guest"
)

// Phase reprezintă faza curentă a meciului
type Phase string

const (
	PhaseWaiting    Phase = "waiting"    // Așteptăm al doilea jucător
	PhaseSetup      Phase = "setup"      // Ambii ascund fișierul
	PhaseInfiltrate Phase = "infiltrate" // Ambii atacă containerul advers
	PhaseFinished   Phase = "finished"   // Meciul s-a terminat
)

// Player conține tot ce știe serverul despre un jucător
type Player struct {
	ID          string
	Role        PlayerRole
	Keys        *SSHKeyPair // Cheia SSH generată pentru el
	ContainerID string      // Containerul LUI (pe care îl apără)
	SSHPort     int         // Portul expus pe host pentru containerul lui
	Ready       bool
}

// Arena reprezintă un meci complet între doi jucători
type Arena struct {
	ID         string
	Host       *Player
	Guest      *Player
	Phase      Phase
	Winner     *Player // nil până la final
	CreatedAt  time.Time
	StartedAt  time.Time
	FinishedAt time.Time

	// Durata fazei de Setup în secunde
	SetupDuration time.Duration
}

// NewArena creează o arenă nouă cu un Host inițial
func NewArena(arenaID, hostPlayerID string) *Arena {
	return &Arena{
		ID: arenaID,
		Host: &Player{
			ID:   hostPlayerID,
			Role: RoleHost,
		},
		Phase:         PhaseWaiting,
		CreatedAt:     time.Now(),
		SetupDuration: 90 * time.Second, // 90 secunde pentru Setup
	}
}

// JoinGuest adaugă al doilea jucător în arenă
func (a *Arena) JoinGuest(guestPlayerID string) {
	a.Guest = &Player{
		ID:   guestPlayerID,
		Role: RoleGuest,
	}
}

// BothReady verifică dacă ambii jucători sunt pregătiți
func (a *Arena) BothReady() bool {
	return a.Host != nil && a.Guest != nil &&
		a.Host.Ready && a.Guest.Ready
}
