package arena

import (
	"context"
	"math"

	"github.com/jackc/pgx/v5/pgxpool"
)

// kFactor returns the ELO K-factor for a player based on their total games.
// K=32 for the first 30 games (provisional), K=16 after that (established).
func kFactor(gamesPlayed int) float64 {
	if gamesPlayed < 30 {
		return 32
	}
	return 16
}

// expectedScore returns the expected score for player A vs player B.
func expectedScore(eloA, eloB int) float64 {
	return 1.0 / (1.0 + math.Pow(10, float64(eloB-eloA)/400.0))
}

// eloAfter returns the new ELO rating for a player given their score (1=win, 0=loss, 0.5=draw).
func eloAfter(current, eloOpponent, gamesPlayed int, score float64) int {
	k := kFactor(gamesPlayed)
	exp := expectedScore(current, eloOpponent)
	delta := k * (score - exp)
	result := current + int(math.Round(delta))
	if result < 100 {
		result = 100 // floor at 100
	}
	return result
}

// UpdateELO updates ELO, wins and losses for a competitive win.
// winnerID won, loserID lost.
func UpdateELO(ctx context.Context, db *pgxpool.Pool, winnerID, loserID int) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	type row struct {
		elo, wins, losses, draws int
	}
	fetch := func(id int) (row, error) {
		var r row
		err := tx.QueryRow(ctx,
			`SELECT elo, wins, losses, draws FROM users WHERE id=$1`, id,
		).Scan(&r.elo, &r.wins, &r.losses, &r.draws)
		return r, err
	}

	w, err := fetch(winnerID)
	if err != nil {
		return err
	}
	l, err := fetch(loserID)
	if err != nil {
		return err
	}

	wGames := w.wins + w.losses + w.draws
	lGames := l.wins + l.losses + l.draws

	newWinnerELO := eloAfter(w.elo, l.elo, wGames, 1.0)
	newLoserELO := eloAfter(l.elo, w.elo, lGames, 0.0)

	if _, err := tx.Exec(ctx,
		`UPDATE users SET elo=$1, wins=wins+1 WHERE id=$2`,
		newWinnerELO, winnerID,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE users SET elo=$1, losses=losses+1 WHERE id=$2`,
		newLoserELO, loserID,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// UpdateELODraw updates ELO and draws for both players (score = 0.5 each).
func UpdateELODraw(ctx context.Context, db *pgxpool.Pool, id1, id2 int) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	type row struct {
		elo, wins, losses, draws int
	}
	fetch := func(id int) (row, error) {
		var r row
		err := tx.QueryRow(ctx,
			`SELECT elo, wins, losses, draws FROM users WHERE id=$1`, id,
		).Scan(&r.elo, &r.wins, &r.losses, &r.draws)
		return r, err
	}

	p1, err := fetch(id1)
	if err != nil {
		return err
	}
	p2, err := fetch(id2)
	if err != nil {
		return err
	}

	g1 := p1.wins + p1.losses + p1.draws
	g2 := p2.wins + p2.losses + p2.draws

	new1 := eloAfter(p1.elo, p2.elo, g1, 0.5)
	new2 := eloAfter(p2.elo, p1.elo, g2, 0.5)

	if _, err := tx.Exec(ctx, `UPDATE users SET elo=$1, draws=draws+1 WHERE id=$2`, new1, id1); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET elo=$1, draws=draws+1 WHERE id=$2`, new2, id2); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
