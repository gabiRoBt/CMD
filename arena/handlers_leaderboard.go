package arena

import (
	"context"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
)

type LeaderboardEntry struct {
	Rank     int     `json:"rank"`
	Username string  `json:"username"`
	ELO      int     `json:"elo"`
	Wins     int     `json:"wins"`
	Losses   int     `json:"losses"`
	Draws    int     `json:"draws"`
	WinPct   float64 `json:"win_pct"`
}

// GET /api/leaderboard?limit=20
func handleLeaderboard(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := 20
		if l := r.URL.Query().Get("limit"); l != "" {
			if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
				limit = n
			}
		}

		rows, err := db.Query(context.Background(),
			`SELECT username, elo, wins, losses, draws
			 FROM users
			 WHERE is_guest = FALSE
			 ORDER BY elo DESC, wins DESC
			 LIMIT $1`,
			limit,
		)
		if err != nil {
			http.Error(w, "db error", 500)
			return
		}
		defer rows.Close()

		entries := make([]LeaderboardEntry, 0, limit)
		rank := 1
		for rows.Next() {
			var e LeaderboardEntry
			if err := rows.Scan(&e.Username, &e.ELO, &e.Wins, &e.Losses, &e.Draws); err != nil {
				continue
			}
			e.Rank = rank
			total := e.Wins + e.Losses + e.Draws
			if total > 0 {
				e.WinPct = float64(e.Wins) / float64(total) * 100
			}
			entries = append(entries, e)
			rank++
		}

		writeJSON(w, entries)
	}
}
