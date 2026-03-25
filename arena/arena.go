package arena

import "time"

type PlayerRole string

const (
	RoleHost  PlayerRole = "host"
	RoleGuest PlayerRole = "guest"
)

type Phase string

const (
	PhaseWaiting    Phase = "waiting"
	PhaseSetup      Phase = "setup"
	PhaseInfiltrate Phase = "infiltrate"
	PhaseFinished   Phase = "finished"
)

type Player struct {
	ID          string
	Role        PlayerRole
	ContainerID string
	SSHPort     int
	Ready       bool
}

type Arena struct {
	ID         string
	Host       *Player
	Guest      *Player
	Phase      Phase
	Winner     *Player
	CreatedAt  time.Time
	StartedAt  time.Time
	FinishedAt time.Time

	SetupDuration time.Duration
}

func NewArena(arenaID, hostPlayerID string) *Arena {
	return &Arena{
		ID: arenaID,
		Host: &Player{
			ID:   hostPlayerID,
			Role: RoleHost,
		},
		Phase:         PhaseWaiting,
		CreatedAt:     time.Now(),
		SetupDuration: 90 * time.Second,
	}
}

func (a *Arena) JoinGuest(guestPlayerID string) {
	a.Guest = &Player{
		ID:   guestPlayerID,
		Role: RoleGuest,
	}
}

func (a *Arena) BothReady() bool {
	return a.Host != nil && a.Guest != nil &&
		a.Host.Ready && a.Guest.Ready
}
