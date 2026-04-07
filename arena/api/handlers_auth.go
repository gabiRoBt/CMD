package api

import (
	"CMD/arena/auth"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ── Middleware ────────────────────────────────────────────────────────────────

// requireAuth extracts and validates the Bearer JWT.
// On success it calls next; on failure it returns 401.
func requireAuth(db *pgxpool.Pool, next func(w http.ResponseWriter, r *http.Request, c *auth.Claims)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			http.Error(w, "missing token", 401)
			return
		}
		c, err := auth.ValidateJWT(strings.TrimPrefix(h, "Bearer "))
		if err != nil {
			http.Error(w, "invalid token", 401)
			return
		}
		next(w, r, c)
	}
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// POST /api/auth/register  { username, password }
func handleRegister(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", 405)
			return
		}
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Username == "" || req.Password == "" {
			http.Error(w, "username and password required", 400)
			return
		}
		if len(req.Username) < 3 || len(req.Username) > 24 {
			http.Error(w, "username must be 3–24 chars", 400)
			return
		}

		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			http.Error(w, "server error", 500)
			return
		}

		var userID int
		err = db.QueryRow(context.Background(),
			`INSERT INTO users (username, password, is_guest) VALUES ($1, $2, FALSE) RETURNING id`,
			req.Username, hash,
		).Scan(&userID)
		if err != nil {
			if strings.Contains(err.Error(), "unique") {
				http.Error(w, "username already taken", 409)
				return
			}
			http.Error(w, "server error", 500)
			return
		}

		tok, _ := auth.GenerateJWT(userID, req.Username, false)
		writeJSON(w, map[string]interface{}{"token": tok, "username": req.Username, "elo": 1000, "is_guest": false})
	}
}

// POST /api/auth/login  { username, password }
func handleLogin(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", 405)
			return
		}
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON", 400)
			return
		}

		var (
			userID  int
			hash    string
			isGuest bool
			elo     int
		)
		err := db.QueryRow(context.Background(),
			`SELECT id, password, is_guest, elo FROM users WHERE username=$1`,
			req.Username,
		).Scan(&userID, &hash, &isGuest, &elo)
		if err != nil {
			http.Error(w, "invalid credentials", 401)
			return
		}
		if isGuest {
			http.Error(w, "use guest login for guest accounts", 400)
			return
		}
		if !auth.CheckPassword(hash, req.Password) {
			http.Error(w, "invalid credentials", 401)
			return
		}

		tok, _ := auth.GenerateJWT(userID, req.Username, false)
		writeJSON(w, map[string]interface{}{"token": tok, "username": req.Username, "elo": elo, "is_guest": false})
	}
}

// POST /api/auth/guest  { name }
// Creates or reuses a guest account with unique username guest_<name> or guest_<name>_N.
func handleGuest(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", 405)
			return
		}
		var req struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
			http.Error(w, "name required", 400)
			return
		}

		base := "guest_" + sanitizeUsername(req.Name)
		username := base
		var userID int

		// Try base name, then base_1, base_2, ... up to 99
		for i := 0; i <= 99; i++ {
			if i > 0 {
				username = fmt.Sprintf("%s_%d", base, i)
			}
			err := db.QueryRow(context.Background(),
				`INSERT INTO users (username, is_guest) VALUES ($1, TRUE)
				 ON CONFLICT (username) DO NOTHING RETURNING id`,
				username,
			).Scan(&userID)
			if err == nil && userID > 0 {
				break
			}
			// username exists — try next suffix
			userID = 0
		}
		if userID == 0 {
			// All suffixes taken — fetch existing guest's id
			db.QueryRow(context.Background(),
				`SELECT id FROM users WHERE username=$1`, username,
			).Scan(&userID)
		}

		tok, _ := auth.GenerateJWT(userID, username, true)
		writeJSON(w, map[string]interface{}{"token": tok, "username": username, "elo": 0, "is_guest": true})
	}
}

// GET /api/auth/me  — returns profile decoded from JWT (fetches ELO from DB to always be perfectly accurately synced)
func handleMe(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			http.Error(w, "missing token", 401)
			return
		}
		c, err := auth.ValidateJWT(strings.TrimPrefix(h, "Bearer "))
		if err != nil {
			http.Error(w, "invalid token", 401)
			return
		}

		elo := 0
		if !c.IsGuest {
			db.QueryRow(context.Background(), `SELECT elo FROM users WHERE id=$1`, c.UserID).Scan(&elo)
		}

		writeJSON(w, map[string]interface{}{
			"user_id":  c.UserID,
			"username": c.Username,
			"is_guest": c.IsGuest,
			"elo":      elo,
		})
	}
}

// PATCH /api/auth/username  { new_username }  (auth required)
func handleChangeUsername(db *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(db, func(w http.ResponseWriter, r *http.Request, c *auth.Claims) {
		if r.Method != http.MethodPatch {
			http.Error(w, "method not allowed", 405)
			return
		}
		if c.IsGuest {
			http.Error(w, "guests cannot change username", 403)
			return
		}
		var req struct {
			NewUsername string `json:"new_username"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.NewUsername == "" {
			http.Error(w, "new_username required", 400)
			return
		}
		if len(req.NewUsername) < 3 || len(req.NewUsername) > 24 {
			http.Error(w, "username must be 3–24 chars", 400)
			return
		}

		_, err := db.Exec(context.Background(),
			`UPDATE users SET username=$1 WHERE id=$2`,
			req.NewUsername, c.UserID,
		)
		if err != nil {
			if strings.Contains(err.Error(), "unique") {
				http.Error(w, "username already taken", 409)
				return
			}
			http.Error(w, "server error", 500)
			return
		}

		newTok, _ := auth.GenerateJWT(c.UserID, req.NewUsername, false)
		writeJSON(w, map[string]interface{}{"token": newTok, "username": req.NewUsername})
	})
}

// sanitizeUsername strips non-alphanumeric chars and lowercases.
func sanitizeUsername(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
		}
	}
	result := b.String()
	if len(result) > 20 {
		result = result[:20]
	}
	if result == "" {
		result = "player"
	}
	return result
}
