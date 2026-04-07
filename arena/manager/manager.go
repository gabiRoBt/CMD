package manager

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

// AbilityTokens — hash-uri random, injectate ca env vars în container.
type AbilityTokens struct {
	Scramble string
	Repair   string
	Rocket   string
	Sonar    string
}

type Player struct {
	ID          string
	Role        PlayerRole
	PublicKey   string
	ContainerID string
	SSHPort     int
	Ready       bool
	Abilities   []string  // validate la final de setup
	LastAttack  string    // ultima abilitate primită
	AttackAt    time.Time // timestamp pentru repair kit (5s window)
}

type Arena struct {
	ID         string
	Name       string // display name chosen by creator
	Type       string // "casual" or "competitive"
	Host       *Player
	Guest      *Player
	Phase      Phase
	Winner     *Player
	CreatedAt  time.Time
	StartedAt  time.Time
	FinishedAt time.Time

	SetupDuration  time.Duration
	AttackDuration time.Duration

	HostTokens  AbilityTokens
	GuestTokens AbilityTokens

	// DB user IDs; 0 means anonymous / guest
	HostUserID  int
	GuestUserID int
}

type ArenaView struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Phase    string `json:"phase"`
	HostID   string `json:"host_id"`
	GuestID  string `json:"guest_id,omitempty"`
	HasGuest bool   `json:"has_guest"`
}

func NewArena(arenaID, hostPlayerID, name, arenaType string) *Arena {
	if name == "" {
		name = arenaID
	}
	if arenaType != "competitive" {
		arenaType = "casual"
	}
	return &Arena{
		ID:             arenaID,
		Name:           name,
		Type:           arenaType,
		Host:           &Player{ID: hostPlayerID, Role: RoleHost},
		Phase:          PhaseWaiting,
		CreatedAt:      time.Now(),
		SetupDuration:  210 * time.Second,
		AttackDuration: 180 * time.Second,
	}
}

func (a *Arena) JoinGuest(guestPlayerID string) {
	a.Guest = &Player{ID: guestPlayerID, Role: RoleGuest}
}

func (a *Arena) BothReady() bool {
	return a.Host != nil && a.Guest != nil &&
		a.Host.Ready && a.Guest.Ready
}
