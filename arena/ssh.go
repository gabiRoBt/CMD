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

// SSHKeyPair conține cheia privată și cheia publică
type SSHKeyPair struct {
	PrivateKeyPEM string
	PublicKey     string
}

// GenerateSSHKeyPair generează o pereche RSA 2048 on-the-fly (folosită acum pentru MasterKey)
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

// validatePublicKey verifică că string-ul primit e o cheie publică SSH validă.
func validatePublicKey(pubKey string) error {
	key := strings.TrimSpace(pubKey)
	if key == "" {
		return fmt.Errorf("cheia publică este goală")
	}
	_, _, _, _, err := ssh.ParseAuthorizedKey([]byte(key))
	if err != nil {
		return fmt.Errorf("format invalid (așteptat: ssh-rsa / ed25519 authorized_keys): %w", err)
	}
	return nil
}

// wsConnWrapper transformă un WebSocket într-un io.ReadWriter
// pentru a putea fi conectat direct la in/out-ul sesiunii SSH.
type wsConnWrapper struct {
	*websocket.Conn
}

func (w *wsConnWrapper) Read(p []byte) (n int, err error) {
	_, msg, err := w.Conn.ReadMessage()
	if err != nil {
		return 0, err
	}
	return copy(p, msg), nil
}

func (w *wsConnWrapper) Write(p []byte) (n int, err error) {
	err = w.Conn.WriteMessage(websocket.TextMessage, p)
	if err != nil {
		return 0, err
	}
	return len(p), nil
}

// StartSSHProxy conectează un client WebSocket la un server SSH
func StartSSHProxy(ws *websocket.Conn, sshAddress string, privateKeyPEM []byte) {
	defer ws.Close()

	signer, err := ssh.ParsePrivateKey(privateKeyPEM)
	if err != nil {
		log.Printf("Eroare parsare cheie privată SSH (Master): %v", err)
		ws.WriteMessage(websocket.TextMessage, []byte("\r\n[Eroare interna SSH]\r\n"))
		return
	}

	config := &ssh.ClientConfig{
		User: "player",
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	sshClient, err := ssh.Dial("tcp", sshAddress, config)
	if err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n[Eroare conectare SSH: %v]\r\n", err)))
		return
	}
	defer sshClient.Close()

	session, err := sshClient.NewSession()
	if err != nil {
		ws.WriteMessage(websocket.TextMessage, []byte("\r\n[Eroare creare sesiune SSH]\r\n"))
		return
	}
	defer session.Close()

	if err := session.RequestPty("xterm-256color", 40, 80, ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}); err != nil {
		log.Printf("Eroare RequestPty: %v", err)
	}

	wsWrapper := &wsConnWrapper{ws}
	session.Stdin = wsWrapper
	session.Stdout = wsWrapper
	session.Stderr = wsWrapper

	if err := session.Shell(); err != nil {
		log.Printf("Eroare pornire shell: %v", err)
		return
	}

	session.Wait()
}
