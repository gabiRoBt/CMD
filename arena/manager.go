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
		return nil, fmt.Errorf("eroare generare chei master: %w", err)
	}

	return &Manager{
		docker:     cli,
		arenas:     make(map[string]*Arena),
		MasterKeys: masterKeys,
	}, nil
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
	a.JoinGuest(guestPlayerID)
	log.Printf("[Arena %s] %s s-a alăturat", arenaID, guestPlayerID)
	return a, nil
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

	hostPort, hostContainerID, err := m.spawnContainer(a.ID, "host")
	if err != nil {
		return fmt.Errorf("eroare container host: %w", err)
	}
	a.Host.ContainerID = hostContainerID
	a.Host.SSHPort = hostPort

	guestPort, guestContainerID, err := m.spawnContainer(a.ID, "guest")
	if err != nil {
		_ = m.docker.ContainerRemove(context.Background(), hostContainerID, types.ContainerRemoveOptions{Force: true})
		return fmt.Errorf("eroare container guest: %w", err)
	}
	a.Guest.ContainerID = guestContainerID
	a.Guest.SSHPort = guestPort

	log.Printf("[Arena %s] Aștept SSH...", a.ID)
	if err := waitForSSH("127.0.0.1", hostPort, 30*time.Second); err != nil {
		return fmt.Errorf("SSH host nu răspunde: %w", err)
	}
	if err := waitForSSH("127.0.0.1", guestPort, 30*time.Second); err != nil {
		return fmt.Errorf("SSH guest nu răspunde: %w", err)
	}

	a.Phase = PhaseSetup
	a.StartedAt = time.Now()

	log.Printf("[Arena %s] Gata! Host:%d | Guest:%d", a.ID, hostPort, guestPort)
	go m.runSetupTimer(a)
	return nil
}

func (m *Manager) spawnContainer(arenaID, role string) (int, string, error) {
	ctx := context.Background()
	sshPort := rand.Intn(10000) + 30000

	// Acum injectăm DOAR cheia serverului, jucătorul se conectează prin proxy-ul web
	serverKey := m.MasterKeys.PublicKey

	resp, err := m.docker.ContainerCreate(
		ctx,
		&container.Config{
			Image: ArenaImage,
			Env: []string{
				fmt.Sprintf("PLAYER_PUBLIC_KEY=%s", serverKey),
				fmt.Sprintf("ARENA_ID=%s", arenaID),
				fmt.Sprintf("PLAYER_ROLE=%s", role),
			},
			ExposedPorts: nat.PortSet{"22/tcp": struct{}{}},
		},
		&container.HostConfig{
			PortBindings: nat.PortMap{
				"22/tcp": []nat.PortBinding{
					{HostIP: "0.0.0.0", HostPort: fmt.Sprintf("%d", sshPort)},
				},
			},
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
	return fmt.Errorf("timeout după %v așteptând SSH pe %s", timeout, addr)
}

func (m *Manager) runSetupTimer(a *Arena) {
	time.Sleep(a.SetupDuration)
	if a.Phase == PhaseSetup {
		a.Phase = PhaseInfiltrate
	}
}

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
				m.docker.ContainerStop(context.Background(), a.Host.ContainerID, container.StopOptions{})
				onWin(a.Guest)
				m.cleanup(a)
				return
			}
			if m.checkNukeFile(a.Guest.ContainerID) {
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

func (m *Manager) cleanup(a *Arena) {
	ctx := context.Background()
	opts := types.ContainerRemoveOptions{Force: true}
	_ = m.docker.ContainerRemove(ctx, a.Host.ContainerID, opts)
	_ = m.docker.ContainerRemove(ctx, a.Guest.ContainerID, opts)
	delete(m.arenas, a.ID)
}

func generateID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

// LeaveArena permite unui jucător să iasă dintr-o arenă care nu a început încă
func (m *Manager) LeaveArena(arenaID, playerID string) error {
	a, ok := m.arenas[arenaID]
	if !ok {
		return fmt.Errorf("arena nu există")
	}
	if a.Phase != PhaseWaiting {
		return fmt.Errorf("meciul este deja în curs, nu mai poți părăsi arena")
	}

	if a.Host != nil && a.Host.ID == playerID {
		// Dacă Host-ul iese, ștergem arena cu totul
		delete(m.arenas, arenaID)
		log.Printf("[Arena %s] Host-ul %s a ieșit. Arena a fost ștearsă.", arenaID, playerID)
	} else if a.Guest != nil && a.Guest.ID == playerID {
		// Dacă Guest-ul iese, doar eliberăm locul
		a.Guest = nil
		log.Printf("[Arena %s] Guest-ul %s a ieșit.", arenaID, playerID)
	} else {
		return fmt.Errorf("nu ești în această arenă")
	}

	return nil
}
