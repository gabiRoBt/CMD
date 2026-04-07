package main

import (
	"CMD/arena/api"
	"CMD/arena/db"
	"CMD/arena/manager"
	"CMD/arena/ws"
	"context"
	"fmt"
	"log"
	"os"
)

func main() {
	log.SetFlags(log.Ltime | log.Lshortfile)
	fmt.Println("=== CMD Arena Server ===")

	ctx := context.Background()
	dbPool, err := db.InitDB(ctx)
	if err != nil {
		log.Printf("Avertisment: nu m-am putut conecta la PostgreSQL: %v\n", err)
	} else {
		defer dbPool.Close()
	}

	mgr, err := manager.NewManager(dbPool)
	if err != nil {
		log.Fatalf("EROARE: %v\nAsigură-te că Docker rulează.", err)
	}
	fmt.Println("✓ Conectat la Docker")
	fmt.Println("✓ MasterKey SSH generată")

	hub := ws.NewHub()
	go hub.Run()
	fmt.Println("✓ WebSocket Hub pornit")

	server := api.NewServer(mgr, hub, dbPool)

	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		fmt.Sscanf(p, "%d", &port)
	}

	fmt.Printf("✓ Server pornit pe http://localhost:%d\n", port)
	if err := server.Start(port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
