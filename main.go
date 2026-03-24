package main

import (
	"fmt"
	"log"
	"os"

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

	hub := arena.NewHub()
	go hub.Run()
	fmt.Println("✓ WebSocket Hub pornit")

	server := arena.NewServer(manager, hub)

	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		fmt.Sscanf(p, "%d", &port)
	}

	fmt.Printf("✓ Server pornit pe http://localhost:%d\n", port)
	fmt.Println("  Deschide browserul pentru lobby.")

	if err := server.Start(port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
