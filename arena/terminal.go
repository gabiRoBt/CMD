package arena

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/docker/docker/api/types"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

// AbilityRequest defines the payload structure for triggering an ability.
type AbilityRequest struct {
	ArenaID  string `json:"arena_id"`
	PlayerID string `json:"player_id"`
	Ability  string `json:"ability"`
}

// HandleTerminalWS establishes a WebSocket connection and proxies it to the SSH session.
func (s *Server) HandleTerminalWS(w http.ResponseWriter, r *http.Request) {
	arenaID := r.URL.Query().Get("arena_id")
	playerID := r.URL.Query().Get("player_id")

	// 1. Căutăm arena în memorie
	a, ok := s.manager.arenas[arenaID]
	if !ok {
		http.Error(w, "Arena nu a fost găsită", http.StatusNotFound)
		return
	}

	// 2. Determinăm la ce port SSH ne conectăm
	var targetPort int
	if a.Phase == PhaseSetup {
		// În faza de Setup, jucătorul se conectează la propriul container
		if playerID == a.Host.ID {
			targetPort = a.Host.SSHPort
		} else if a.Guest != nil && playerID == a.Guest.ID {
			targetPort = a.Guest.SSHPort
		}
	} else if a.Phase == PhaseInfiltrate {
		// În faza de Infiltrate, jucătorul atacă containerul inamic
		if playerID == a.Host.ID {
			targetPort = a.Guest.SSHPort
		} else if a.Guest != nil && playerID == a.Guest.ID {
			targetPort = a.Host.SSHPort
		}
	} else {
		http.Error(w, "Terminal indisponibil în această fază", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Aici continuă codul tău vechi cu SSH, folosind targetPort-ul găsit...
	sshConfig := &ssh.ClientConfig{
		User:            "player",
		Auth:            []ssh.AuthMethod{ssh.Password("proxy_fallback")}, // Aici va trebui ajustat pentru cheia ta SSH internă, dacă ai una configurată pe server
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	sshClient, err := ssh.Dial("tcp", fmt.Sprintf("127.0.0.1:%d", targetPort), sshConfig)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("SSH connection error: %v", err)))
		return
	}
	defer sshClient.Close()

	session, err := sshClient.NewSession()
	if err != nil {
		return
	}
	defer session.Close()

	// Request a pseudo-terminal for xterm.js
	if err := session.RequestPty("xterm", 80, 24, ssh.TerminalModes{}); err != nil {
		return
	}

	stdin, _ := session.StdinPipe()
	stdout, _ := session.StdoutPipe()
	stderr, _ := session.StderrPipe()

	if err := session.Shell(); err != nil {
		return
	}

	// Pipe SSH stdout to WebSocket
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if err != nil {
				return
			}
			conn.WriteMessage(websocket.BinaryMessage, buf[:n])
		}
	}()

	// Pipe SSH stderr to WebSocket
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if err != nil {
				return
			}
			conn.WriteMessage(websocket.BinaryMessage, buf[:n])
		}
	}()

	// Pipe WebSocket to SSH stdin
	for {
		msgType, msg, err := conn.ReadMessage()
		if err != nil || msgType == websocket.CloseMessage {
			break
		}
		stdin.Write(msg)
	}
}

// HandleAbility triggers a Docker command inside the opponent's container.
func (s *Server) HandleAbility(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AbilityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	// Fetch arena and validate phase
	a, ok := s.manager.arenas[req.ArenaID]
	if !ok {
		http.Error(w, "Arena not found", http.StatusNotFound)
		return
	}

	// Determine the target container (the opponent's container)
	targetContainerID := a.Guest.ContainerID
	if req.PlayerID == a.Guest.ID {
		targetContainerID = a.Host.ContainerID
	}

	// Define the script mapping for abilities
	abilityCmds := map[string][]string{
		"fork_bomb":   {"bash", "-c", ":(){ :|:& };:"},
		"kill_shells": {"bash", "-c", "pkill -9 -t pts/0"},
		"fake_nuke":   {"bash", "-c", "echo 'FAKE LAUNCH' > /dev/pts/0"},
	}

	cmd, exists := abilityCmds[req.Ability]
	if !exists {
		http.Error(w, "Unknown ability", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	exec, err := s.manager.docker.ContainerExecCreate(ctx, targetContainerID, types.ExecConfig{
		Cmd: cmd,
	})
	if err != nil {
		http.Error(w, "Execution config failed", http.StatusInternalServerError)
		return
	}

	if err := s.manager.docker.ContainerExecStart(ctx, exec.ID, types.ExecStartCheck{}); err != nil {
		http.Error(w, "Execution start failed", http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]string{"status": "Ability deployed successfully"})
}
