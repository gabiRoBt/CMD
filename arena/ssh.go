package arena

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"

	"golang.org/x/crypto/ssh"
)

// SSHKeyPair conține cheia privată (dată jucătorului) și cheia publică (pusă în container)
type SSHKeyPair struct {
	PrivateKeyPEM string // jucătorul salvează asta în ~/.ssh/
	PublicKey     string // intră în containerul Docker ca authorized_keys
}

// GenerateSSHKeyPair generează o pereche RSA 2048 on-the-fly
func GenerateSSHKeyPair() (*SSHKeyPair, error) {
	// Generăm cheia privată RSA
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}

	// Serializăm cheia privată în format PEM
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	})

	// Generăm cheia publică în formatul SSH authorized_keys
	publicKey, err := ssh.NewPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil, err
	}

	return &SSHKeyPair{
		PrivateKeyPEM: string(privateKeyPEM),
		PublicKey:     string(ssh.MarshalAuthorizedKey(publicKey)),
	}, nil
}
