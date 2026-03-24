package arena

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

const (
	ArenaImage     = "cmd-arena:latest"
	MaxMemoryBytes = 128 * 1024 * 1024
	MaxCPUShares   = 256
	MaxPIDs        = 100
)

type Manager struct {
	docker *client.Client
	arenas map[string]*Arena
}

func NewManager() (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("nu mă pot conecta la Docker: %w", err)
	}
	return &Manager{
		docker: cli,
		arenas: make(map[string]*Arena),
	}, nil
}

func (m *Manager) CreateArena(hostPlayerID string) (*Arena, error) {
	arenaID := generateID("arena")
	arena := NewArena(arenaID, hostPlayerID)
	m.arenas[arenaID] = arena
	log.Printf("[Arena %s] Creată de jucătorul %s", arenaID, hostPlayerID)
	return arena, nil
}

func (m *Manager) JoinArena(arenaID, guestPlayerID string) (*Arena, error) {
	arena, ok := m.arenas[arenaID]
	if !ok {
		return nil, fmt.Errorf("arena %s nu există", arenaID)
	}
	if arena.Phase != PhaseWaiting {
		return nil, fmt.Errorf("arena %s nu mai acceptă jucători", arenaID)
	}
	if arena.Guest != nil {
		return nil, fmt.Errorf("arena %s este plină", arenaID)
	}
	arena.JoinGuest(guestPlayerID)
	log.Printf("[Arena %s] Jucătorul %s s-a alăturat", arenaID, guestPlayerID)
	return arena, nil
}

func (m *Manager) SetReady(arenaID, playerID string) (*Arena, error) {
	arena, ok := m.arenas[arenaID]
	if !ok {
		return nil, fmt.Errorf("arena %s nu există", arenaID)
	}
	switch playerID {
	case arena.Host.ID:
		arena.Host.Ready = true
	case arena.Guest.ID:
		arena.Guest.Ready = true
	default:
		return nil, fmt.Errorf("jucătorul %s nu e în arena %s", playerID, arenaID)
	}
	if arena.BothReady() {
		if err := m.startContainers(arena); err != nil {
			return nil, fmt.Errorf("eroare la pornirea containerelor: %w", err)
		}
	}
	return arena, nil
}

func (m *Manager) startContainers(a *Arena) error {
	log.Printf("[Arena %s] Pornesc containerele...", a.ID)

	hostKeys, err := GenerateSSHKeyPair()
	if err != nil {
		return fmt.Errorf("eroare generare chei host: %w", err)
	}
	guestKeys, err := GenerateSSHKeyPair()
	if err != nil {
		return fmt.Errorf("eroare generare chei guest: %w", err)
	}

	a.Host.Keys = hostKeys
	a.Guest.Keys = guestKeys

	hostPort, hostContainerID, err := m.spawnContainer(a.ID, "host", hostKeys.PublicKey)
	if err != nil {
		return fmt.Errorf("eroare container host: %w", err)
	}
	a.Host.ContainerID = hostContainerID
	a.Host.SSHPort = hostPort

	guestPort, guestContainerID, err := m.spawnContainer(a.ID, "guest", guestKeys.PublicKey)
	if err != nil {
		_ = m.docker.ContainerRemove(context.Background(), hostContainerID, types.ContainerRemoveOptions{Force: true})
		return fmt.Errorf("eroare container guest: %w", err)
	}
	a.Guest.ContainerID = guestContainerID
	a.Guest.SSHPort = guestPort

	// Așteptăm ca SSH să fie gata în ambele containere
	log.Printf("[Arena %s] Aștept ca SSH să fie gata...", a.ID)
	if err := waitForSSH("127.0.0.1", hostPort, 30*time.Second); err != nil {
		return fmt.Errorf("SSH host nu răspunde: %w", err)
	}
	if err := waitForSSH("127.0.0.1", guestPort, 30*time.Second); err != nil {
		return fmt.Errorf("SSH guest nu răspunde: %w", err)
	}

	a.Phase = PhaseSetup
	a.StartedAt = time.Now()

	log.Printf("[Arena %s] Containere gata! Host port: %d | Guest port: %d", a.ID, hostPort, guestPort)

	go m.runSetupTimer(a)
	return nil
}

func (m *Manager) spawnContainer(arenaID, role, publicKey string) (int, string, error) {
	ctx := context.Background()

	sshPort := rand.Intn(10000) + 30000

	portBinding := nat.PortMap{
		"22/tcp": []nat.PortBinding{
			{HostIP: "0.0.0.0", HostPort: fmt.Sprintf("%d", sshPort)},
		},
	}

	envVars := []string{
		fmt.Sprintf("PLAYER_PUBLIC_KEY=%s", publicKey),
		fmt.Sprintf("ARENA_ID=%s", arenaID),
		fmt.Sprintf("PLAYER_ROLE=%s", role),
	}

	resp, err := m.docker.ContainerCreate(
		ctx,
		&container.Config{
			Image: ArenaImage,
			Env:   envVars,
			ExposedPorts: nat.PortSet{
				"22/tcp": struct{}{},
			},
		},
		&container.HostConfig{
			PortBindings: portBinding,
			NetworkMode:  "bridge",
			Resources: container.Resources{
				Memory:    MaxMemoryBytes,
				CPUShares: MaxCPUShares,
				PidsLimit: func() *int64 { v := int64(MaxPIDs); return &v }(),
			},
			SecurityOpt: []string{"no-new-privileges:true"},
		},
		&network.NetworkingConfig{},
		nil,
		fmt.Sprintf("cmd-%s-%s", arenaID, role),
	)
	if err != nil {
		return 0, "", fmt.Errorf("ContainerCreate: %w", err)
	}

	if err := m.docker.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		return 0, "", fmt.Errorf("ContainerStart: %w", err)
	}

	return sshPort, resp.ID, nil
}

// waitForSSH încearcă să se conecteze la portul SSH până când reușește sau expiră timeout-ul
func waitForSSH(host string, port int, timeout time.Duration) error {
	addr := fmt.Sprintf("%s:%d", host, port)
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", addr, 1*time.Second)
		if err == nil {
			conn.Close()
			return nil // SSH e gata!
		}
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("timeout după %v așteptând SSH pe %s", timeout, addr)
}

func (m *Manager) runSetupTimer(a *Arena) {
	log.Printf("[Arena %s] Faza Setup — %v rămase", a.ID, a.SetupDuration)
	time.Sleep(a.SetupDuration)
	if a.Phase != PhaseSetup {
		return
	}
	log.Printf("[Arena %s] Setup terminat — trec la Infiltrate", a.ID)
	a.Phase = PhaseInfiltrate
}

func (m *Manager) WatchForWinner(a *Arena, onWin func(winner *Player)) {
	go func() {
		for {
			time.Sleep(2 * time.Second)
			if a.Phase == PhaseFinished {
				return
			}
			// Verificăm fișierul martor /tmp/nuke_success în fiecare container
			hostNuked := m.checkNukeFile(a.Host.ContainerID)
			guestNuked := m.checkNukeFile(a.Guest.ContainerID)

			if hostNuked {
				// Containerul Host a fost nuked → Guest a câștigat
				a.Phase = PhaseFinished
				a.Winner = a.Guest
				a.FinishedAt = time.Now()
				m.docker.ContainerStop(context.Background(), a.Host.ContainerID, container.StopOptions{})
				onWin(a.Guest)
				m.cleanup(a)
				return
			}
			if guestNuked {
				// Containerul Guest a fost nuked → Host a câștigat
				a.Phase = PhaseFinished
				a.Winner = a.Host
				a.FinishedAt = time.Now()
				m.docker.ContainerStop(context.Background(), a.Guest.ContainerID, container.StopOptions{})
				onWin(a.Host)
				m.cleanup(a)
				return
			}
		}
	}()
}

// checkNukeFile verifică dacă /tmp/nuke_success există în container
func (m *Manager) checkNukeFile(containerID string) bool {
	ctx := context.Background()

	exec, err := m.docker.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		Cmd:          []string{"test", "-f", "/tmp/nuke_success"},
		AttachStdout: false,
		AttachStderr: false,
	})
	if err != nil {
		return false
	}

	// Pornim exec-ul
	err = m.docker.ContainerExecStart(ctx, exec.ID, types.ExecStartCheck{})
	if err != nil {
		return false
	}

	// Așteptăm să termine (polling până ExitCode != -1)
	for i := 0; i < 10; i++ {
		inspect, err := m.docker.ContainerExecInspect(ctx, exec.ID)
		if err != nil {
			return false
		}
		if !inspect.Running {
			return inspect.ExitCode == 0
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}

func (m *Manager) isContainerStopped(containerID string) bool {
	info, err := m.docker.ContainerInspect(context.Background(), containerID)
	if err != nil {
		return true
	}
	return !info.State.Running
}

func (m *Manager) cleanup(a *Arena) {
	log.Printf("[Arena %s] Cleanup — șterg containerele", a.ID)
	ctx := context.Background()
	opts := types.ContainerRemoveOptions{Force: true}
	_ = m.docker.ContainerRemove(ctx, a.Host.ContainerID, opts)
	_ = m.docker.ContainerRemove(ctx, a.Guest.ContainerID, opts)
	delete(m.arenas, a.ID)
}

func GetSSHCommand(serverIP string, player *Player) string {
	return fmt.Sprintf("ssh player@%s -p %d -i ~/.ssh/cmd_key", serverIP, player.SSHPort)
}

func generateID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}
