package arena

import (
	cryptorand "crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

// generateID returns a time-based unique ID with the given prefix.
func generateID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

// generateAbilityTokens creates a fresh set of random hex tokens for one player.
func generateAbilityTokens() AbilityTokens {
	return AbilityTokens{
		Scramble: randomHex(12),
		Repair:   randomHex(12),
		Rocket:   randomHex(12),
		Sonar:    randomHex(12),
	}
}

// randomHex returns a cryptographically random hex string of length 2n.
func randomHex(n int) string {
	b := make([]byte, n)
	cryptorand.Read(b)
	return hex.EncodeToString(b)
}
