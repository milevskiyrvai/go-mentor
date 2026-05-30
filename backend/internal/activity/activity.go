package activity

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/middleware"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/jmoiron/sqlx"
)

type Event struct {
	ID         int64           `db:"id" json:"id"`
	UserID     uuid.UUID       `db:"user_id" json:"user_id"`
	ActorID    *uuid.UUID      `db:"actor_id" json:"actor_id,omitempty"`
	Type       string          `db:"type" json:"type"`
	SourceType *string         `db:"source_type" json:"source_type,omitempty"`
	SourceID   *string         `db:"source_id" json:"source_id,omitempty"`
	Metadata   json.RawMessage `db:"metadata" json:"metadata"`
	CreatedAt  time.Time       `db:"created_at" json:"created_at"`
}

type Notification struct {
	ID        int64           `db:"id" json:"id"`
	UserID    uuid.UUID       `db:"user_id" json:"user_id"`
	Type      string          `db:"type" json:"type"`
	Title     string          `db:"title" json:"title"`
	Body      *string         `db:"body" json:"body,omitempty"`
	Metadata  json.RawMessage `db:"metadata" json:"metadata"`
	IsRead    bool            `db:"is_read" json:"is_read"`
	CreatedAt time.Time       `db:"created_at" json:"created_at"`
}

type BuddyResolver interface {
	GetBuddyOfStudent(ctx context.Context, studentID uuid.UUID) (*uuid.UUID, error)
}

type Service struct {
	db    *sqlx.DB
	buddy BuddyResolver
}

func NewService(db *sqlx.DB, buddy BuddyResolver) *Service {
	return &Service{db: db, buddy: buddy}
}

// LogEvent — записывает событие активности.
func (s *Service) LogEvent(ctx context.Context, userID uuid.UUID, actorID *uuid.UUID, evType string, sourceType, sourceID *string, metadata any) {
	raw := json.RawMessage(`{}`)
	if metadata != nil {
		if b, err := json.Marshal(metadata); err == nil {
			raw = b
		}
	}
	_, _ = s.db.ExecContext(ctx, `
		INSERT INTO activity_events (user_id, actor_id, type, source_type, source_id, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, userID, actorID, evType, sourceType, sourceID, raw)
}

// NotifyAchievement — implementation of achievements.Notifier
func (s *Service) NotifyAchievement(ctx context.Context, userID uuid.UUID, a models.Achievement) {
	body := ""
	if a.Description != nil {
		body = *a.Description
	}
	s.Notify(ctx, userID, "achievement_unlocked", "Достижение получено: "+a.Title, &body, map[string]any{
		"achievement_id": a.ID,
		"reward_bonus":   a.RewardBonus,
		"image_url":      a.ImageURL,
	})
	src := "achievement"
	srcID := a.ID.String()
	s.LogEvent(ctx, userID, nil, "achievement_unlocked", &src, &srcID, map[string]any{
		"title":        a.Title,
		"reward_bonus": a.RewardBonus,
	})
}

func (s *Service) Notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, metadata any) {
	raw := json.RawMessage(`{}`)
	if metadata != nil {
		if b, err := json.Marshal(metadata); err == nil {
			raw = b
		}
	}
	_, _ = s.db.ExecContext(ctx, `
		INSERT INTO notifications (user_id, type, title, body, metadata)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, evType, title, body, raw)
}

func (s *Service) ListEventsForStudent(ctx context.Context, studentID uuid.UUID, limit int) ([]Event, error) {
	if limit == 0 {
		limit = 100
	}
	var out []Event
	err := s.db.SelectContext(ctx, &out, `
		SELECT id, user_id, actor_id, type, source_type, source_id, metadata, created_at
		FROM activity_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
	`, studentID, limit)
	return out, err
}

func (s *Service) ListNotifications(ctx context.Context, userID uuid.UUID, onlyUnread bool, limit int) ([]Notification, error) {
	if limit == 0 {
		limit = 50
	}
	q := `SELECT id, user_id, type, title, body, metadata, is_read, created_at
	      FROM notifications WHERE user_id = $1`
	args := []any{userID}
	if onlyUnread {
		q += ` AND is_read = FALSE`
	}
	q += ` ORDER BY created_at DESC LIMIT $2`
	args = append(args, limit)
	var out []Notification
	err := s.db.SelectContext(ctx, &out, q, args...)
	return out, err
}

func (s *Service) MarkRead(ctx context.Context, userID uuid.UUID, ids []int64) error {
	if len(ids) == 0 {
		_, err := s.db.ExecContext(ctx, `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, userID)
		return err
	}
	_, err := s.db.ExecContext(ctx, `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2)`, userID, ids)
	return err
}

// ====== HTTP ======

type Handler struct {
	svc   *Service
	buddy BuddyResolver
}

func NewHandler(svc *Service, buddy BuddyResolver) *Handler {
	return &Handler{svc: svc, buddy: buddy}
}

func (h *Handler) StudentActivity(w http.ResponseWriter, r *http.Request) {
	viewerID, _ := middleware.UserIDFromContext(r.Context())
	role, _ := middleware.SelectedRoleFromContext(r.Context())
	studentID, err := uuid.Parse(chi.URLParam(r, "studentID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	allowed := false
	switch role {
	case string(models.RoleAdmin):
		allowed = true
	case string(models.RoleBuddy):
		buddyID, _ := h.buddy.GetBuddyOfStudent(r.Context(), studentID)
		if buddyID != nil && *buddyID == viewerID {
			allowed = true
		}
	case string(models.RoleStudent):
		if viewerID == studentID {
			allowed = true
		}
	}
	if !allowed {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.svc.ListEventsForStudent(r.Context(), studentID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) MyNotifications(w http.ResponseWriter, r *http.Request) {
	uid, _ := middleware.UserIDFromContext(r.Context())
	onlyUnread := r.URL.Query().Get("only_unread") == "true"
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.svc.ListNotifications(r.Context(), uid, onlyUnread, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type markReadRequest struct {
	IDs []int64 `json:"ids,omitempty"`
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	uid, _ := middleware.UserIDFromContext(r.Context())
	var req markReadRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	if err := h.svc.MarkRead(r.Context(), uid, req.IDs); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// helpers

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}

var _ = errors.New
