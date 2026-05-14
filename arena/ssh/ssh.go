package ssh

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"
	"strings"

	"github.com/gorilla/websocket"
	gossh "golang.org/x/crypto/ssh"
)

type SSHKeyPair struct {
	PrivateKeyPEM string
	PublicKey     string
}

func GenerateSSHKeyPair() (*SSHKeyPair, error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	})
	publicKey, err := gossh.NewPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil, err
	}
	return &SSHKeyPair{
		PrivateKeyPEM: string(privateKeyPEM),
		PublicKey:     string(gossh.MarshalAuthorizedKey(publicKey)),
	}, nil
}

func validatePublicKey(pubKey string) error {
	key := strings.TrimSpace(pubKey)
	if key == "" {
		return fmt.Errorf("cheia publică este goală")
	}
	_, _, _, _, err := gossh.ParseAuthorizedKey([]byte(key))
	return err
}

// wsConnWrapper — bridge WebSocket ↔ SSH.
// buf reține restul unui mesaj WebSocket care nu a încăput în p la Read().
// buf holds the rest of a WebSocket message that didn't fit into p in Read().
type wsConnWrapper struct {
	*websocket.Conn
	buf []byte
}

// Read implements io.Reader with internal buffering.
// copy(p, msg) silently truncated messages larger than p — the fix
// consumes the message gradually, keeping the rest in buf for subsequent calls.
func (w *wsConnWrapper) Read(p []byte) (int, error) {
	for len(w.buf) == 0 {
		_, msg, err := w.Conn.ReadMessage()
		if err != nil {
			return 0, err
		}
		w.buf = msg
	}
	n := copy(p, w.buf)
	w.buf = w.buf[n:]
	return n, nil
}

func (w *wsConnWrapper) Write(p []byte) (int, error) {
	if err := w.Conn.WriteMessage(websocket.BinaryMessage, p); err != nil {
		return 0, err
	}
	return len(p), nil
}

func StartSSHProxy(ws *websocket.Conn, sshAddress string, privateKeyPEM []byte) {
	defer ws.Close()

	signer, err := gossh.ParsePrivateKey(privateKeyPEM)
	if err != nil {
		log.Printf("Eroare parsare MasterKey: %v", err)
		ws.WriteMessage(websocket.TextMessage, []byte("\r\n[Eroare internă SSH]\r\n"))
		return
	}

	config := &gossh.ClientConfig{
		User:            "player",
		Auth:            []gossh.AuthMethod{gossh.PublicKeys(signer)},
		HostKeyCallback: gossh.InsecureIgnoreHostKey(),
	}

	sshClient, err := gossh.Dial("tcp", sshAddress, config)
	if err != nil {
		ws.WriteMessage(websocket.TextMessage,
			[]byte(fmt.Sprintf("\r\n[Eroare SSH: %v]\r\n", err)))
		return
	}
	defer sshClient.Close()

	session, err := sshClient.NewSession()
	if err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte("\r\n[Eroare creare sesiune]\r\n"))
		return
	}
	defer session.Close()

	if err := session.RequestPty("xterm-256color", 40, 80, gossh.TerminalModes{
		gossh.ECHO:          1,
		gossh.TTY_OP_ISPEED: 115200,
		gossh.TTY_OP_OSPEED: 115200,
	}); err != nil {
		log.Printf("RequestPty error: %v", err)
	}

	wsw := &wsConnWrapper{Conn: ws}
	session.Stdin = wsw
	session.Stdout = wsw
	session.Stderr = wsw

	if err := session.Shell(); err != nil {
		log.Printf("Shell error: %v", err)
		return
	}
	session.Wait()
}
