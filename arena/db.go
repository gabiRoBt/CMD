package arena

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InitDB opens a pgxpool connection and runs schema migrations.
// Reads DATABASE_URL from environment (e.g. "postgres://user:pass@host:5432/dbname").
func InitDB(ctx context.Context) (*pgxpool.Pool, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/cmd_arena"
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
