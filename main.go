package main

import (
	"CMD/arena"
	"context"
	"fmt"
	"log"
	"os"
)

func main() {
	log.SetFlags(log.Ltime | log.Lshortfile)
	fmt.Println("=== CMD Arena Server ===")

	ctx := context.Background()
	db, err := arena.InitDB(ctx)
	if err != nil {
		log.Printf("Avertisment: nu m-am putut conecta la PostgreSQL: %v\n", err)
	} else {
		defer db.Close()
	}

	manager, err := arena.NewManager(db)
	if err != nil {
		log.Fatalf("EROARE: %v\nAsigură-te că Docker rulează.", err)
	}
	fmt.Println("✓ Conectat la Docker")
	fmt.Println("✓ MasterKey SSH generată")

	hub := arena.NewHub()
	go hub.Run()
	fmt.Println("✓ WebSocket Hub pornit")

	server := arena.NewServer(manager, hub, db)

	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		fmt.Sscanf(p, "%d", &port)
	}

	fmt.Printf("✓ Server pornit pe http://localhost:%d\n", port)
	if err := server.Start(port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
