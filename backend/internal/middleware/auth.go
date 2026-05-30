package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

type ctxKey int

const (
	ctxKeyUserID ctxKey = iota
	ctxKeyRole
)

type SessionParser interface {
	Parse(token string) (*ParsedClaims, error)
}

type ParsedClaims struct {
	UserID       uuid.UUID
	SelectedRole string
}

func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKeyUserID, id)
}

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(ctxKeyUserID).(uuid.UUID)
	return v, ok
}

func WithSelectedRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, ctxKeyRole, role)
}

func SelectedRoleFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(ctxKeyRole).(string)
	return v, ok && v != ""
}

// AuthRequired extracts session cookie, validates it, and injects user_id + role into context.
// parseToken — функция, парсящая JWT в claims (передаём из auth-пакета чтобы избежать циклической зависимости).
func AuthRequired(cookieName string, parseToken func(string) (uuid.UUID, string, error)) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, err := r.Cookie(cookieName)
			if err != nil || c.Value == "" {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			uid, role, err := parseToken(c.Value)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			ctx := WithUserID(r.Context(), uid)
			if role != "" {
				ctx = WithSelectedRole(ctx, role)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole — middleware, требующее одну из ролей. Использовать после AuthRequired.
func RequireRole(roles ...models.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, ok := SelectedRoleFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusForbidden, "role_not_selected")
				return
			}
			for _, allowed := range roles {
				if string(allowed) == role {
					next.ServeHTTP(w, r)
					return
				}
			}
			writeError(w, http.StatusForbidden, "forbidden")
		})
	}
}

func writeError(w http.ResponseWriter, status int, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": code})
}
