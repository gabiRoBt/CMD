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

// AbilityTokens — hash-uri random, injectate ca env vars în container.
// Fișierele din ~/pouch/ sunt validate: basename ∋ key AND content == hash.
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
}

func NewArena(arenaID, hostPlayerID string) *Arena {
	return &Arena{
		ID:             arenaID,
		Host:           &Player{ID: hostPlayerID, Role: RoleHost},
		Phase:          PhaseWaiting,
		CreatedAt:      time.Now(),
		SetupDuration:  210 * time.Second, // 3:30
		AttackDuration: 180 * time.Second, // 3:00
	}
}

func (a *Arena) JoinGuest(guestPlayerID string) {
	a.Guest = &Player{ID: guestPlayerID, Role: RoleGuest}
}

func (a *Arena) BothReady() bool {
	return a.Host != nil && a.Guest != nil &&
		a.Host.Ready && a.Guest.Ready
}
