package arena

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"
	"strings"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
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
	publicKey, err := ssh.NewPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil, err
	}
	return &SSHKeyPair{
		PrivateKeyPEM: string(privateKeyPEM),
		PublicKey:     string(ssh.MarshalAuthorizedKey(publicKey)),
	}, nil
}

func validatePublicKey(pubKey string) error {
	key := strings.TrimSpace(pubKey)
	if key == "" {
		return fmt.Errorf("cheia publică este goală")
	}
	_, _, _, _, err := ssh.ParseAuthorizedKey([]byte(key))
	return err
}

// wsConnWrapper — bridge WebSocket ↔ SSH.
// Folosim BinaryMessage pentru date terminale (bytes arbitrari).
// Frontend setează ws.binaryType = 'arraybuffer' și scrie Uint8Array.
type wsConnWrapper struct{ *websocket.Conn }

func (w *wsConnWrapper) Read(p []byte) (int, error) {
	_, msg, err := w.Conn.ReadMessage()
	if err != nil {
		return 0, err
	}
	return copy(p, msg), nil
}

func (w *wsConnWrapper) Write(p []byte) (int, error) {
	// BinaryMessage — browserul primește ArrayBuffer, convertit la Uint8Array → xterm.write()
	if err := w.Conn.WriteMessage(websocket.BinaryMessage, p); err != nil {
		return 0, err
	}
	return len(p), nil
}

func StartSSHProxy(ws *websocket.Conn, sshAddress string, privateKeyPEM []byte) {
	defer ws.Close()

	signer, err := ssh.ParsePrivateKey(privateKeyPEM)
	if err != nil {
		log.Printf("Eroare parsare MasterKey: %v", err)
		ws.WriteMessage(websocket.TextMessage, []byte("\r\n[Eroare internă SSH]\r\n"))
		return
	}

	config := &ssh.ClientConfig{
		User:            "player",
		Auth:            []ssh.AuthMethod{ssh.PublicKeys(signer)},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	sshClient, err := ssh.Dial("tcp", sshAddress, config)
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

	if err := session.RequestPty("xterm-256color", 40, 80, ssh.TerminalModes{
		ssh.ECHO: 1, ssh.TTY_OP_ISPEED: 14400, ssh.TTY_OP_OSPEED: 14400,
	}); err != nil {
		log.Printf("RequestPty error: %v", err)
	}

	wsw := &wsConnWrapper{ws}
	session.Stdin = wsw
	session.Stdout = wsw
	session.Stderr = wsw

	if err := session.Shell(); err != nil {
		log.Printf("Shell error: %v", err)
		return
	}
	session.Wait()
}
