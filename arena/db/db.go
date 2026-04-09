package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InitDB opens a pgxpool connection and runs schema migrations.
// Reads DATABASE_URL from environment (e.g. "postgres://user:pass@host:5432/dbname").
func InitDB(ctx context.Context) (*pgxpool.Pool, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	err := createDatabaseIfNotExists(ctx, dsn)
	if err != nil {
		log.Printf("[InitDB] Could not ensure db exists: %v", err)
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("pgxpool.New: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("db ping: %w", err)
	}

	if err := migrate(ctx, pool); err != nil {
		return nil, fmt.Errorf("migration: %w", err)
	}

	log.Println("✓ PostgreSQL connected")
	return pool, nil
}

func createDatabaseIfNotExists(ctx context.Context, dsn string) error {
	// Simple DSN parsing to extract dbname and connect to "postgres"
	// Example DSN: postgres://user:pass@localhost:5432/dbname
	lastSlash := strings.LastIndex(dsn, "/")
	if lastSlash == -1 {
		return fmt.Errorf("invalid DSN format")
	}
	baseDsn := dsn[:lastSlash] + "/postgres"

	// Try parsing query params e.g. ?sslmode=disable
	dbNameAndParams := dsn[lastSlash+1:]
	dbName := dbNameAndParams
	if questionParams := strings.Index(dbNameAndParams, "?"); questionParams != -1 {
		dbName = dbNameAndParams[:questionParams]
		baseDsn += dbNameAndParams[questionParams:]
	}

	pool, err := pgxpool.New(ctx, baseDsn)
	if err != nil {
		return err
	}
	defer pool.Close()

	var exists bool
	err = pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)", dbName).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		log.Printf("Baza de date %s nu exista. O cream...", dbName)
		_, err = pool.Exec(ctx, fmt.Sprintf("CREATE DATABASE %s", dbName))
		if err != nil {
			return err
		}
		log.Printf("Baza de date %s a fost creata cu succes.", dbName)
	}
	return nil
}

func migrate(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id           SERIAL PRIMARY KEY,
			username     TEXT UNIQUE NOT NULL,
			password     TEXT,
			is_guest     BOOLEAN NOT NULL DEFAULT FALSE,
			elo          INTEGER NOT NULL DEFAULT 1000,
			wins         INTEGER NOT NULL DEFAULT 0,
			losses       INTEGER NOT NULL DEFAULT 0,
			draws        INTEGER NOT NULL DEFAULT 0,
			created_at   TIMESTAMPTZ DEFAULT NOW()
		);
	`)
	return err
}
