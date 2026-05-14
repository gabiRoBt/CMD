package manager

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
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
	mu     sync.RWMutex
	docker *client.Client
	dbPool *pgxpool.Pool
	arenas map[string]*Arena
}

// DockerClient expune clientul Docker pentru docker exec (terminal proxy).
func (m *Manager) DockerClient() *client.Client {
	return m.docker
}

func NewManager(dbPool *pgxpool.Pool) (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("cannot connect to Docker: %w", err)
	}
	m := &Manager{
		docker: cli,
		dbPool: dbPool,
		arenas: make(map[string]*Arena),
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

// startContainers provizionează două containere pentru un meci.
// No longer wait for SSH — terminal connects via docker exec directly.
func (m *Manager) startContainers(a *Arena) error {
	log.Printf("[Arena %s] Starting containers...", a.ID)
	a.HostTokens = generateAbilityTokens()
	a.GuestTokens = generateAbilityTokens()

	hostID, err := m.spawnContainer(a.ID, "host", a.Type, a.Host.Lang, a.HostTokens)
	if err != nil {
		return fmt.Errorf("host container: %w", err)
	}
	a.Host.ContainerID = hostID

	guestID, err := m.spawnContainer(a.ID, "guest", a.Type, a.Guest.Lang, a.GuestTokens)
	if err != nil {
		m.forceRemove(hostID)
		return fmt.Errorf("guest container: %w", err)
	}
	a.Guest.ContainerID = guestID

	// Wait for entrypoint to finish setup (files, permissions, etc.)
	if err := m.waitForContainerReady(hostID); err != nil {
		m.forceRemove(hostID)
		m.forceRemove(guestID)
		return fmt.Errorf("host container not ready: %w", err)
	}
	if err := m.waitForContainerReady(guestID); err != nil {
		m.forceRemove(hostID)
		m.forceRemove(guestID)
		return fmt.Errorf("guest container not ready: %w", err)
	}

	a.Phase = PhaseCountdown
	log.Printf("[Arena %s] Ready — Host:%s | Guest:%s", a.ID, hostID[:12], guestID[:12])
	return nil
}

func (m *Manager) spawnContainer(arenaID, role, arenaType, lang string, tokens AbilityTokens) (string, error) {
	ctx := context.Background()
	resp, err := m.docker.ContainerCreate(
		ctx,
		&container.Config{
			Image: ArenaImage,
			Env: []string{
				// PLAYER_PUBLIC_KEY removed — we no longer use SSH
				fmt.Sprintf("ARENA_ID=%s", arenaID),
				fmt.Sprintf("PLAYER_ROLE=%s", role),
				fmt.Sprintf("ARENA_TYPE=%s", arenaType),
				fmt.Sprintf("PLAYER_LANG=%s", lang),
				fmt.Sprintf("ABILITY_SCRAMBLE=%s", tokens.Scramble),
				fmt.Sprintf("ABILITY_REPAIR=%s", tokens.Repair),
				fmt.Sprintf("ABILITY_ROCKET=%s", tokens.Rocket),
				fmt.Sprintf("ABILITY_SONAR=%s", tokens.Sonar),
			},
			// Nu mai expunem port SSH
		},
		&container.HostConfig{
			AutoRemove:  false,
			NetworkMode: "none", // izolat complet de rețea — nu are nevoie de SSH
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
		return "", fmt.Errorf("ContainerCreate: %w", err)
	}
	if err := m.docker.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		m.forceRemove(resp.ID)
		return "", fmt.Errorf("ContainerStart: %w", err)
	}
	return resp.ID, nil
}

// waitForContainerReady waits until the container is running and the entrypoint has finished setup.
// Check for the existence of the /tmp/.ready sentinel file created by entrypoint at the end.
func (m *Manager) waitForContainerReady(containerID string) error {
	ctx := context.Background()
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		inspect, err := m.docker.ContainerInspect(ctx, containerID)
		if err != nil {
			return fmt.Errorf("inspect error: %w", err)
		}
		if !inspect.State.Running {
			time.Sleep(200 * time.Millisecond)
			continue
		}
		// Container rulează — verificăm dacă entrypoint-ul a terminat
		if m.checkFileExists(containerID, "/tmp/.ready") {
			return nil
		}
		time.Sleep(200 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for container %s", containerID[:12])
}

// checkFileExists verifică rapid dacă un fișier există în container.
func (m *Manager) checkFileExists(containerID, path string) bool {
	ctx := context.Background()
	exec, err := m.docker.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		Cmd: []string{"test", "-f", path},
	})
	if err != nil {
		return false
	}
	if err := m.docker.ContainerExecStart(ctx, exec.ID, types.ExecStartCheck{}); err != nil {
		return false
	}
	for i := 0; i < 5; i++ {
		ins, err := m.docker.ContainerExecInspect(ctx, exec.ID)
		if err != nil {
			return false
		}
		if !ins.Running {
			return ins.ExitCode == 0
		}
		time.Sleep(50 * time.Millisecond)
	}
	return false
}

func (m *Manager) stopContainer(containerID string) {
	// Skip graceful stop to instantly kill the nuke script and close terminal WS.
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

// waitForSSH removed — using docker exec instead of SSH.
