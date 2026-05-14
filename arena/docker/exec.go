package docker

import (
	"context"
	"encoding/json"
	"io"
	"log"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/gorilla/websocket"
)

// resizeMsg este trimis de frontend când xterm se redimensionează.
type resizeMsg struct {
	Type string `json:"type"`
	Rows uint   `json:"rows"`
	Cols uint   `json:"cols"`
}

// StartExecProxy atașează o sesiune docker exec la un WebSocket.
//
// Față de SSH proxy:
//   - Elimină layer-ul SSH (handshake, criptare, port TCP over Docker bridge)
//   - Go vorbește direct cu Docker daemon via named pipe (Windows) / unix socket (Linux)
//   - Latența per-caracter scade dramatic pe Windows cu Docker Desktop (WSL2)
//
// Protocol WS:
//   - Binary messages  → date terminal (stdin spre container, stdout/stderr spre browser)
//   - Text messages    → control JSON {"type":"resize","rows":N,"cols":N}
func StartExecProxy(ws *websocket.Conn, dockerClient *client.Client, containerID string) {
	defer ws.Close()
	ctx := context.Background()

	// Creăm o sesiune exec cu PTY în container, ca user "player"
	execResp, err := dockerClient.ContainerExecCreate(ctx, containerID, types.ExecConfig{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          []string{"/bin/bash", "--login"},
		User:         "player",
		WorkingDir:   "/home/player",
		Env:          []string{"TERM=xterm-256color", "HOME=/home/player"},
	})
	if err != nil {
		log.Printf("[Exec] ContainerExecCreate error: %v", err)
		ws.WriteMessage(websocket.TextMessage, []byte("\r\n[exec error: "+err.Error()+"]\r\n"))
		return
	}

	// Atașăm stdin/stdout/stderr
	hijack, err := dockerClient.ContainerExecAttach(ctx, execResp.ID, types.ExecStartCheck{Tty: true})
	if err != nil {
		log.Printf("[Exec] ContainerExecAttach error: %v", err)
		ws.WriteMessage(websocket.TextMessage, []byte("\r\n[exec attach error: "+err.Error()+"]\r\n"))
		return
	}
	defer hijack.Close()

	// WS → container stdin (goroutine separată)
	go func() {
		for {
			msgType, data, err := ws.ReadMessage()
			if err != nil {
				return
			}
			if msgType == websocket.TextMessage {
				// Verificăm dacă e mesaj de control (resize JSON)
				var msg resizeMsg
				if json.Unmarshal(data, &msg) == nil && msg.Type == "resize" && msg.Rows > 0 && msg.Cols > 0 {
					dockerClient.ContainerExecResize(ctx, execResp.ID, types.ResizeOptions{
						Height: msg.Rows,
						Width:  msg.Cols,
					})
					continue
				}
				// Nu e resize → e input terminal (xterm trimite text messages)
			}
			// Date terminale → stdin container
			if _, err := hijack.Conn.Write(data); err != nil {
				return
			}
		}
	}()

	// container stdout/stderr → WS (loop principal)
	buf := make([]byte, 32*1024)
	for {
		n, err := hijack.Reader.Read(buf)
		if n > 0 {
			if wErr := ws.WriteMessage(websocket.BinaryMessage, buf[:n]); wErr != nil {
				break
			}
		}
		if err != nil {
			if err != io.EOF {
				log.Printf("[Exec] Read error: %v", err)
			}
			break
		}
	}
}
