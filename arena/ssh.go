package arena

import (
	"fmt"
	"strings"

	"golang.org/x/crypto/ssh"
)

// validatePublicKey verifică că string-ul primit e o cheie publică SSH validă.
// Serverul nu mai generează chei — le primește de la jucători.
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
