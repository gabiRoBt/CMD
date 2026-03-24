package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"CMD/arena"
)

func main() {
	log.SetFlags(log.Ltime | log.Lshortfile)
	fmt.Println("=== CMD Arena Server ===")

	manager, err := arena.NewManager()
	if err != nil {
		log.Fatalf("EROARE: %v\nAsigură-te că Docker rulează.", err)
	}
	fmt.Println("✓ Conectat la Docker")

	a, err := manager.CreateArena("player-alice")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("✓ Arena creată: %s\n", a.ID)

	_, err = manager.JoinArena(a.ID, "player-bob")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("✓ Bob s-a alăturat arenei")

	a, err = manager.SetReady(a.ID, "player-alice")
	if err != nil {
		log.Fatal(err)
	}
	a, err = manager.SetReady(a.ID, "player-bob")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("✓ Ambii jucători sunt Ready")
	fmt.Println("⏳ Aștept SSH să pornească în containere...")

	// Salvăm cheile SSH pe disk automat
	homeDir, _ := os.UserHomeDir()
	sshDir := filepath.Join(homeDir, ".ssh")
	_ = os.MkdirAll(sshDir, 0700)

	aliceKeyPath := filepath.Join(sshDir, "cmd_alice")
	bobKeyPath := filepath.Join(sshDir, "cmd_bob")

	if err := os.WriteFile(aliceKeyPath, []byte(a.Host.Keys.PrivateKeyPEM), 0600); err != nil {
		log.Printf("Nu am putut salva cheia Alice: %v", err)
	} else {
		fmt.Printf("✓ Cheia Alice salvată: %s\n", aliceKeyPath)
	}

	if err := os.WriteFile(bobKeyPath, []byte(a.Guest.Keys.PrivateKeyPEM), 0600); err != nil {
		log.Printf("Nu am putut salva cheia Bob: %v", err)
	} else {
		fmt.Printf("✓ Cheia Bob salvată: %s\n", bobKeyPath)
	}

	serverIP := getServerIP()

	fmt.Println("\n=== Comenzi de conectare ===")
	fmt.Printf("Alice: ssh player@%s -p %d -i %s\n", serverIP, a.Host.SSHPort, aliceKeyPath)
	fmt.Printf("Bob:   ssh player@%s -p %d -i %s\n", serverIP, a.Guest.SSHPort, bobKeyPath)
	fmt.Println("\n✓ SSH gata — puteți conecta acum!")

	manager.WatchForWinner(a, func(winner *arena.Player) {
		fmt.Printf("\n🏆 CÂȘTIGĂTOR: Jucătorul %s (%s)!\n", winner.ID, winner.Role)
		os.Exit(0)
	})

	fmt.Println("\nServer activ. Ctrl+C pentru oprire.")
	select {}
}

func getServerIP() string {
	ip := os.Getenv("SERVER_IP")
	if ip == "" {
		return "127.0.0.1"
	}
	return ip
}
