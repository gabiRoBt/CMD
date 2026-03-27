package arena

import (
	"bytes"
	"context"
	cryptorand "crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	mathrand "math/rand"
	"net"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
)

const (
	ArenaImage     = "cmd-arena:latest"
	MaxMemoryBytes = 128 * 1024 * 1024
	MaxCPUShares   = 256
	MaxPIDs        = 100
	// Prefix folosit la numirea containerelor — pentru cleanup la startup
	ContainerPrefix = "cmd-arena-"
)

type Manager struct {
	docker     *client.Client
	arenas     map[string]*Arena
	MasterKeys *SSHKeyPair
}

func NewManager() (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("nu mă pot conecta la Docker: %w", err)
	}
	masterKeys, err := GenerateSSHKeyPair()
	if err != nil {
		return nil, fmt.Errorf("eroare generare MasterKey: %w", err)
	}
	m := &Manager{
		docker:     cli,
		arenas:     make(map[string]*Arena),
		MasterKeys: masterKeys,
	}
	// Curăță containerele rămase din sesiuni anterioare la startup
	m.cleanupOrphanContainers()
	return m, nil
}

// cleanupOrphanContainers șterge containerele cmd-* rămase din rulări anterioare.
func (m *Manager) cleanupOrphanContainers() {
	ctx := context.Background()
	f := filters.NewArgs()
	f.Add("name", "cmd-arena-")
	containers, err := m.docker.ContainerList(ctx, types.ContainerListOptions{
		All:     true, // include și cele oprite
		Filters: f,
	})
	if err != nil {
		log.Printf("[Startup] Nu pot lista containerele: %v", err)
		return
	}
	if len(containers) == 0 {
		return
	}
	log.Printf("[Startup] Curăț %d containere rămase...", len(containers))
	for _, c := range containers {
		if err := m.docker.ContainerRemove(ctx, c.ID, types.ContainerRemoveOptions{Force: true}); err != nil {
			log.Printf("[Startup] Nu pot șterge %s: %v", c.ID[:12], err)
		} else {
			log.Printf("[Startup] Șters container: %s %v", c.ID[:12], c.Names)
		}
	}
}

func (m *Manager) ListArenas() []ArenaView {
	views := make([]ArenaView, 0, len(m.arenas))
	for _, a := range m.arenas {
		view := ArenaView{
			ID:       a.ID,
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

func (m *Manager) CreateArena(hostPlayerID string) (*Arena, error) {
	m.cancelPlayerLobbies(hostPlayerID)
	arenaID := generateID("arena")
	a := NewArena(arenaID, hostPlayerID)
	m.arenas[arenaID] = a
	log.Printf("[Arena %s] Creată de %s", arenaID, hostPlayerID)
	return a, nil
}

func (m *Manager) JoinArena(arenaID, guestPlayerID string) (*Arena, error) {
	a, ok := m.arenas[arenaID]
	if !ok {
		return nil, fmt.Errorf("arena %s nu există", arenaID)
	}
	if a.Phase != PhaseWaiting {
		return nil, fmt.Errorf("arena %s nu mai acceptă jucători", arenaID)
	}
	if a.Guest != nil {
		return nil, fmt.Errorf("arena %s este plină", arenaID)
	}
	m.cancelPlayerLobbies(guestPlayerID)
	a.JoinGuest(guestPlayerID)
	log.Printf("[Arena %s] %s s-a alăturat", arenaID, guestPlayerID)
	return a, nil
}

func (m *Manager) cancelPlayerLobbies(playerID string) {
	for id, a := range m.arenas {
		if a.Host.ID == playerID && a.Phase == PhaseWaiting {
			delete(m.arenas, id)
			log.Printf("[Arena %s] Lobby anulat — %s a intrat în altă arenă", id, playerID)
		}
	}
}

func (m *Manager) SetReady(arenaID, playerID string) (*Arena, error) {
	a, ok := m.arenas[arenaID]
	if !ok {
		return nil, fmt.Errorf("arena %s nu există", arenaID)
	}
	switch playerID {
	case a.Host.ID:
		a.Host.Ready = true
	case a.Guest.ID:
		a.Guest.Ready = true
	default:
		return nil, fmt.Errorf("jucătorul %s nu e în arena %s", playerID, arenaID)
	}
	if a.BothReady() {
		if err := m.startContainers(a); err != nil {
			return nil, fmt.Errorf("eroare la pornirea containerelor: %w", err)
		}
	}
	return a, nil
}

func (m *Manager) startContainers(a *Arena) error {
	log.Printf("[Arena %s] Pornesc containerele...", a.ID)
	a.HostTokens = generateAbilityTokens()
	a.GuestTokens = generateAbilityTokens()

	hostPort, hostID, err := m.spawnContainer(a.ID, "host", a.HostTokens)
	if err != nil {
		return fmt.Errorf("eroare container host: %w", err)
	}
	a.Host.ContainerID = hostID
	a.Host.SSHPort = hostPort

	guestPort, guestID, err := m.spawnContainer(a.ID, "guest", a.GuestTokens)
	if err != nil {
		m.forceRemove(hostID)
		return fmt.Errorf("eroare container guest: %w", err)
	}
	a.Guest.ContainerID = guestID
	a.Guest.SSHPort = guestPort

	log.Printf("[Arena %s] Aștept SSH...", a.ID)
	if err := waitForSSH("127.0.0.1", hostPort, 30*time.Second); err != nil {
		m.forceRemove(hostID)
		m.forceRemove(guestID)
		return fmt.Errorf("SSH host nu răspunde: %w", err)
	}
	if err := waitForSSH("127.0.0.1", guestPort, 30*time.Second); err != nil {
		m.forceRemove(hostID)
		m.forceRemove(guestID)
		return fmt.Errorf("SSH guest nu răspunde: %w", err)
	}

	a.Phase = PhaseSetup
	a.StartedAt = time.Now()
	log.Printf("[Arena %s] Gata! Host:%d | Guest:%d", a.ID, hostPort, guestPort)
	go m.runSetupTimer(a)
	return nil
}

func (m *Manager) spawnContainer(arenaID, role string, tokens AbilityTokens) (int, string, error) {
	ctx := context.Background()
	sshPort := mathrand.Intn(10000) + 30000

	resp, err := m.docker.ContainerCreate(
		ctx,
		&container.Config{
			Image: ArenaImage,
			Env: []string{
				fmt.Sprintf("PLAYER_PUBLIC_KEY=%s", m.MasterKeys.PublicKey),
				fmt.Sprintf("ARENA_ID=%s", arenaID),
				fmt.Sprintf("PLAYER_ROLE=%s", role),
				fmt.Sprintf("ABILITY_SCRAMBLE=%s", tokens.Scramble),
				fmt.Sprintf("ABILITY_REPAIR=%s", tokens.Repair),
				fmt.Sprintf("ABILITY_ROCKET=%s", tokens.Rocket),
				fmt.Sprintf("ABILITY_SONAR=%s", tokens.Sonar),
			},
			ExposedPorts: nat.PortSet{"22/tcp": struct{}{}},
		},
		&container.HostConfig{
			PortBindings: nat.PortMap{
				"22/tcp": []nat.PortBinding{
					{HostIP: "0.0.0.0", HostPort: fmt.Sprintf("%d", sshPort)},
				},
			},
			// Setăm AutoRemove: containerul se șterge singur când se oprește
			AutoRemove:  true,
			NetworkMode: "bridge",
			Resources: container.Resources{
				Memory:    MaxMemoryBytes,
				CPUShares: MaxCPUShares,
				PidsLimit: func() *int64 { v := int64(MaxPIDs); return &v }(),
			},
			SecurityOpt: []string{"no-new-privileges:true"},
		},
		&network.NetworkingConfig{},
		nil,
		fmt.Sprintf("cmd-arena-%s-%s", arenaID, role),
	)
	if err != nil {
		return 0, "", fmt.Errorf("ContainerCreate: %w", err)
	}
	if err := m.docker.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		return 0, "", fmt.Errorf("ContainerStart: %w", err)
	}
	return sshPort, resp.ID, nil
}

func waitForSSH(host string, port int, timeout time.Duration) error {
	addr := fmt.Sprintf("%s:%d", host, port)
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", addr, 1*time.Second)
		if err == nil {
			conn.Close()
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("timeout %v așteptând SSH pe %s", timeout, addr)
}

func (m *Manager) runSetupTimer(a *Arena) {
	time.Sleep(a.SetupDuration)
	if a.Phase == PhaseSetup {
		a.Phase = PhaseInfiltrate
	}
}

// RunAttackTimer — apelat din server.go după tranziția la Infiltrate.
// Dacă nimeni nu câștigă în AttackDuration, forțăm cleanup și draw.
func (m *Manager) RunAttackTimer(a *Arena, onTimeout func()) {
	go func() {
		time.Sleep(a.AttackDuration)
		if a.Phase == PhaseInfiltrate {
			log.Printf("[Arena %s] Timeout faza Infiltrate — draw", a.ID)
			a.Phase = PhaseFinished
			a.FinishedAt = time.Now()
			m.cleanup(a)
			onTimeout()
		}
	}()
}

// ── Pouch validation ────────────────────────────────────────────────────────────

func (m *Manager) ValidatePouch(containerID string, tokens AbilityTokens) []string {
	script := `for f in /home/player/pouch/*; do [ -f "$f" ] || continue; echo "$(basename "$f"):$(cat "$f" | tr -d '[:space:]')"; done`
	out, err := m.dockerExecOutput(containerID, []string{"bash", "-c", script})
	if err != nil {
		log.Printf("[Pouch] Eroare %s: %v", containerID, err)
		return nil
	}

	tokenMap := map[string]string{
		"scramble": tokens.Scramble, "repair": tokens.Repair,
		"rocket": tokens.Rocket, "sonar": tokens.Sonar,
	}
	unlocked := []string{}
	seen := map[string]bool{}

	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		filename := strings.ToLower(parts[0])
		content := strings.TrimSpace(parts[1])
		for ability, hash := range tokenMap {
			if seen[ability] {
				continue
			}
			if strings.Contains(filename, ability) && content == hash {
				unlocked = append(unlocked, ability)
				seen[ability] = true
				log.Printf("[Pouch] '%s' validată ✓", ability)
			}
		}
	}
	return unlocked
}

// ── Ability execution ────────────────────────────────────────────────────────────

func (m *Manager) ExecuteAbility(targetContainerID, ability string, targetPlayer *Player) error {
	targetPlayer.LastAttack = ability
	targetPlayer.AttackAt = time.Now()
	switch ability {
	case "scramble":
		return m.execScramble(targetContainerID)
	case "rocket":
		return m.execRocket(targetContainerID)
	case "sonar":
		return m.execSonar(targetContainerID)
	default:
		return fmt.Errorf("abilitate necunoscută: %s", ability)
	}
}

func (m *Manager) ExecuteRepair(myPlayer *Player) error {
	if myPlayer.LastAttack == "" {
		return fmt.Errorf("nu există atac de reparat")
	}
	if time.Since(myPlayer.AttackAt) > 5*time.Second {
		return fmt.Errorf("repair window expirat (>5s)")
	}
	switch myPlayer.LastAttack {
	case "scramble":
		err := m.dockerExec(myPlayer.ContainerID, []string{"bash", "-c",
			`printf '' > /home/player/.bash_aliases 2>/dev/null; true`})
		myPlayer.LastAttack = ""
		return err
	case "rocket":
		err := m.dockerExec(myPlayer.ContainerID, []string{"bash", "-c",
			`pids=$(pgrep -u player -f bash 2>/dev/null); [ -n "$pids" ] && kill -CONT $pids 2>/dev/null; true`})
		myPlayer.LastAttack = ""
		return err
	default:
		return fmt.Errorf("abilitatea '%s' nu poate fi reparată", myPlayer.LastAttack)
	}
}

func (m *Manager) execScramble(id string) error {
	return m.dockerExec(id, []string{"bash", "-c", `cat > /home/player/.bash_aliases << 'EOF'
alias ls='/usr/bin/find . -maxdepth 1 -not -name ".*" 2>/dev/null'
alias find='/bin/ls -la'
alias cat='/usr/bin/head -5'
alias head='/usr/bin/tail'
alias tail='/bin/cat'
alias grep='/bin/grep -v'
alias mkdir='/usr/bin/touch'
alias touch='/bin/mkdir -p'
alias mv='/bin/cp'
EOF
chown player:player /home/player/.bash_aliases`})
}

func (m *Manager) execRocket(id string) error {
	return m.dockerExec(id, []string{"bash", "-c",
		`pids=$(pgrep -u player -f bash 2>/dev/null)
if [ -n "$pids" ]; then kill -STOP $pids 2>/dev/null; ( sleep 10; kill -CONT $pids 2>/dev/null ) & fi`})
}

func (m *Manager) execSonar(id string) error {
	return m.dockerExec(id, []string{"bash", "-c",
		`find /home/player -mindepth 1 -type d -empty ! -path '*/pouch' ! -path '*/.ssh' -delete 2>/dev/null; true`})
}

// ── Docker exec helpers ────────────────────────────────────────────────────────

func (m *Manager) dockerExec(containerID string, cmd []string) error {
	ctx := context.Background()
	exec, err := m.docker.ContainerExecCreate(ctx, containerID, types.ExecConfig{Cmd: cmd})
	if err != nil {
		return err
	}
	return m.docker.ContainerExecStart(ctx, exec.ID, types.ExecStartCheck{})
}

func (m *Manager) dockerExecOutput(containerID string, cmd []string) (string, error) {
	ctx := context.Background()
	exec, err := m.docker.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		Cmd: cmd, AttachStdout: true, AttachStderr: true,
	})
	if err != nil {
		return "", err
	}
	resp, err := m.docker.ContainerExecAttach(ctx, exec.ID, types.ExecStartCheck{})
	if err != nil {
		return "", err
	}
	defer resp.Close()
	var buf bytes.Buffer
	stdcopy.StdCopy(&buf, &buf, resp.Reader)
	return buf.String(), nil
}

// ── Win condition ────────────────────────────────────────────────────────────────

func (m *Manager) WatchForWinner(a *Arena, onWin func(winner *Player)) {
	go func() {
		for {
			time.Sleep(2 * time.Second)
			if a.Phase == PhaseFinished {
				return
			}
			if m.checkNukeFile(a.Host.ContainerID) {
				a.Phase = PhaseFinished
				a.Winner = a.Guest
				a.FinishedAt = time.Now()
				// Oprim containerul câștigătorului (cel al inamicului compromis)
				m.stopContainer(a.Host.ContainerID)
				onWin(a.Guest)
				m.cleanup(a)
				return
			}
			if m.checkNukeFile(a.Guest.ContainerID) {
				a.Phase = PhaseFinished
				a.Winner = a.Host
				a.FinishedAt = time.Now()
				m.stopContainer(a.Guest.ContainerID)
				onWin(a.Host)
				m.cleanup(a)
				return
			}
		}
	}()
}

func (m *Manager) checkNukeFile(containerID string) bool {
	ctx := context.Background()
	exec, err := m.docker.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		Cmd: []string{"test", "-f", "/tmp/nuke_success"},
	})
	if err != nil {
		return false
	}
	if err := m.docker.ContainerExecStart(ctx, exec.ID, types.ExecStartCheck{}); err != nil {
		return false
	}
	for i := 0; i < 10; i++ {
		ins, err := m.docker.ContainerExecInspect(ctx, exec.ID)
		if err != nil {
			return false
		}
		if !ins.Running {
			return ins.ExitCode == 0
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}

// stopContainer oprește un container. Dacă AutoRemove=true, Docker îl și șterge automat.
func (m *Manager) stopContainer(containerID string) {
	timeout := 3
	ctx := context.Background()
	if err := m.docker.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		log.Printf("[Cleanup] Stop %s: %v", containerID[:12], err)
	}
}

// forceRemove șterge forțat un container (folosit la erori de startup).
func (m *Manager) forceRemove(containerID string) {
	ctx := context.Background()
	if err := m.docker.ContainerRemove(ctx, containerID, types.ContainerRemoveOptions{Force: true}); err != nil {
		log.Printf("[Cleanup] Remove %s: %v", containerID[:12], err)
	}
}

// cleanup oprește ambele containere și șterge arena din memorie.
// Cu AutoRemove=true, containerele se șterg singure la oprire.
func (m *Manager) cleanup(a *Arena) {
	log.Printf("[Arena %s] Cleanup — șterg containerele", a.ID)
	if a.Host.ContainerID != "" {
		m.stopContainer(a.Host.ContainerID)
	}
	if a.Guest != nil && a.Guest.ContainerID != "" {
		m.stopContainer(a.Guest.ContainerID)
	}
	delete(m.arenas, a.ID)
	log.Printf("[Arena %s] Cleanup complet", a.ID)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

func generateAbilityTokens() AbilityTokens {
	return AbilityTokens{
		Scramble: randomHex(12), Repair: randomHex(12),
		Rocket: randomHex(12), Sonar: randomHex(12),
	}
}

func randomHex(n int) string {
	b := make([]byte, n)
	cryptorand.Read(b)
	return hex.EncodeToString(b)
}

func generateID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}
