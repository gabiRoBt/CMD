package manager

import (
	"CMD/arena/ssh"
	"context"
	"fmt"
	"log"
	"net"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	ArenaImage      = "cmd-arena:latest"
	ContainerPrefix = "cmd-arena-"
	MaxMemoryBytes  = 128 * 1024 * 1024
	MaxCPUShares    = 256
	MaxPIDs         = 100
)

// Manager owns all running arenas and the Docker client.
type Manager struct {
	mu         sync.RWMutex
	docker     *client.Client
	dbPool     *pgxpool.Pool
	arenas     map[string]*Arena
	MasterKeys *ssh.SSHKeyPair
}

func NewManager(dbPool *pgxpool.Pool) (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("cannot connect to Docker: %w", err)
	}
	masterKeys, err := ssh.GenerateSSHKeyPair()
	if err != nil {
		return nil, fmt.Errorf("MasterKey generation error: %w", err)
	}
	m := &Manager{
		docker:     cli,
		dbPool:     dbPool,
		arenas:     make(map[string]*Arena),
		MasterKeys: masterKeys,
	}
	m.cleanupOrphanContainers()
	return m, nil
}

// cleanupOrphanContainers removes leftover containers from previous runs.
func (m *Manager) cleanupOrphanContainers() {
	ctx := context.Background()
	f := filters.NewArgs()
	f.Add("name", ContainerPrefix)
	containers, err := m.docker.ContainerList(ctx, types.ContainerListOptions{All: true, Filters: f})
	if err != nil {
		log.Printf("[Startup] Cannot list containers: %v", err)
		return
	}
	log.Printf("[Startup] Cleaning %d orphan containers...", len(containers))
	for _, c := range containers {
		if err := m.docker.ContainerRemove(ctx, c.ID, types.ContainerRemoveOptions{Force: true}); err != nil {
			log.Printf("[Startup] Cannot remove %s: %v", c.ID[:12], err)
		} else {
			log.Printf("[Startup] Removed: %s %v", c.ID[:12], c.Names)
		}
	}
}

// startContainers provisions two containers for a match and waits for SSH.
func (m *Manager) startContainers(a *Arena) error {
	log.Printf("[Arena %s] Starting containers...", a.ID)
	a.HostTokens = generateAbilityTokens()
	a.GuestTokens = generateAbilityTokens()

	hostPort, hostID, err := m.spawnContainer(a.ID, "host", a.HostTokens)
	if err != nil {
		return fmt.Errorf("host container: %w", err)
	}
	a.Host.ContainerID = hostID
	a.Host.SSHPort = hostPort

	guestPort, guestID, err := m.spawnContainer(a.ID, "guest", a.GuestTokens)
	if err != nil {
		m.forceRemove(hostID)
		return fmt.Errorf("guest container: %w", err)
	}
	a.Guest.ContainerID = guestID
	a.Guest.SSHPort = guestPort

	log.Printf("[Arena %s] Waiting for SSH...", a.ID)
	for _, p := range []struct {
		id   string
		port int
	}{{hostID, hostPort}, {guestID, guestPort}} {
		if err := waitForSSH("127.0.0.1", p.port, 30*time.Second); err != nil {
			m.forceRemove(hostID)
			m.forceRemove(guestID)
			return fmt.Errorf("SSH not ready on port %d: %w", p.port, err)
		}
	}

	a.Phase = PhaseSetup
	a.StartedAt = time.Now()
	log.Printf("[Arena %s] Ready — Host:%d | Guest:%d", a.ID, hostPort, guestPort)
	go m.runSetupTimer(a)
	return nil
}

func (m *Manager) spawnContainer(arenaID, role string, tokens AbilityTokens) (int, string, error) {
	ctx := context.Background()
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
				"22/tcp": []nat.PortBinding{{HostIP: "0.0.0.0", HostPort: "0"}},
			},
			AutoRemove:  false,
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
		fmt.Sprintf("%s%s-%s", ContainerPrefix, arenaID, role),
	)
	if err != nil {
		return 0, "", fmt.Errorf("ContainerCreate: %w", err)
	}
	if err := m.docker.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		m.forceRemove(resp.ID)
		return 0, "", fmt.Errorf("ContainerStart: %w", err)
	}
	inspect, err := m.docker.ContainerInspect(ctx, resp.ID)
	if err != nil {
		m.forceRemove(resp.ID)
		return 0, resp.ID, fmt.Errorf("ContainerInspect: %w", err)
	}
	var port int
	if bindings, ok := inspect.NetworkSettings.Ports["22/tcp"]; ok && len(bindings) > 0 {
		fmt.Sscanf(bindings[0].HostPort, "%d", &port)
	}
	if port == 0 {
		m.forceRemove(resp.ID)
		return 0, resp.ID, fmt.Errorf("could not determine SSH port")
	}
	return port, resp.ID, nil
}

func (m *Manager) stopContainer(containerID string) {
	timeout := 3
	ctx := context.Background()
	if err := m.docker.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		log.Printf("[Cleanup] Stop %s: %v", containerID[:12], err)
	}
	m.forceRemove(containerID)
}

func (m *Manager) forceRemove(containerID string) {
	ctx := context.Background()
	if err := m.docker.ContainerRemove(ctx, containerID, types.ContainerRemoveOptions{Force: true}); err != nil {
		log.Printf("[Cleanup] Remove %s: %v", containerID[:12], err)
	}
}

func (m *Manager) cleanup(a *Arena) {
	log.Printf("[Arena %s] Cleanup", a.ID)
	if a.Host.ContainerID != "" {
		m.stopContainer(a.Host.ContainerID)
	}
	if a.Guest != nil && a.Guest.ContainerID != "" {
		m.stopContainer(a.Guest.ContainerID)
	}
}

func waitForSSH(host string, port int, timeout time.Duration) error {
	addr := net.JoinHostPort(host, fmt.Sprintf("%d", port))
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", addr, 1*time.Second)
		if err == nil {
			conn.Close()
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for SSH on %s", addr)
}
