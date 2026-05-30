package calendar

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/middleware"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/jmoiron/sqlx"
)

var ErrNotFound = errors.New("not found")

type BuddyResolver interface {
	GetBuddyOfStudent(ctx context.Context, studentID uuid.UUID) (*uuid.UUID, error)
}

// Notifier — §19.
type Notifier interface {
	Notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, metadata any)
}

type Service struct {
	db       *sqlx.DB
	buddy    BuddyResolver
	notifier Notifier
}

func NewService(db *sqlx.DB, buddy BuddyResolver) *Service {
	return &Service{db: db, buddy: buddy}
}

func (s *Service) SetNotifier(n Notifier) { s.notifier = n }

func (s *Service) notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, meta any) {
	if s.notifier != nil {
		s.notifier.Notify(ctx, userID, evType, title, body, meta)
	}
}

type CreateInput struct {
	Title           string
	StudentID       *uuid.UUID
	BuddyID         *uuid.UUID
	Type            models.CalendarEventType
	StartDatetime   time.Time
	EndDatetime     *time.Time
	Description     *string
	ReminderEnabled bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (*models.CalendarEvent, error) {
	var ev models.CalendarEvent
	err := s.db.GetContext(ctx, &ev, `
		INSERT INTO calendar_events (title, student_id, buddy_id, type, start_datetime, end_datetime, description, reminder_enabled)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, title, student_id, buddy_id, type, start_datetime, end_datetime, description, reminder_enabled, created_at, updated_at
	`, in.Title, in.StudentID, in.BuddyID, string(in.Type), in.StartDatetime, in.EndDatetime, in.Description, in.ReminderEnabled)
	if err != nil {
		return nil, err
	}
	// §19: уведомление ученику о новом событии в его календаре.
	if ev.StudentID != nil {
		body := "Открой раздел «Календарь», чтобы увидеть детали."
		s.notify(ctx, *ev.StudentID, "calendar_event_created", "Новое событие: "+ev.Title, &body, map[string]any{
			"event_id":       ev.ID,
			"type":           ev.Type,
			"start_datetime": ev.StartDatetime,
		})
	}
	return &ev, nil
}

// GetEvent — для проверки владельца.
func (s *Service) GetEvent(ctx context.Context, id uuid.UUID) (*models.CalendarEvent, error) {
	return s.Get(ctx, id)
}

type UpdateInput struct {
	Title           *string
	Type            *models.CalendarEventType
	StartDatetime   *time.Time
	EndDatetime     *time.Time
	Description     *string
	ReminderEnabled *bool
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, in UpdateInput) (*models.CalendarEvent, error) {
	sets := []string{}
	args := []any{}
	idx := 1
	add := func(col string, v any) {
		sets = append(sets, fmt.Sprintf("%s = $%d", col, idx))
		args = append(args, v)
		idx++
	}
	if in.Title != nil {
		add("title", *in.Title)
	}
	if in.Type != nil {
		add("type", string(*in.Type))
	}
	if in.StartDatetime != nil {
		add("start_datetime", *in.StartDatetime)
	}
	if in.EndDatetime != nil {
		add("end_datetime", *in.EndDatetime)
	}
	if in.Description != nil {
		add("description", *in.Description)
	}
	if in.ReminderEnabled != nil {
		add("reminder_enabled", *in.ReminderEnabled)
	}
	if len(sets) == 0 {
		return s.Get(ctx, id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	q := fmt.Sprintf(`
		UPDATE calendar_events SET %s WHERE id = $%d
		RETURNING id, title, student_id, buddy_id, type, start_datetime, end_datetime, description, reminder_enabled, created_at, updated_at
	`, strings.Join(sets, ", "), idx)
	var ev models.CalendarEvent
	if err := s.db.GetContext(ctx, &ev, q, args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &ev, nil
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (*models.CalendarEvent, error) {
	var ev models.CalendarEvent
	err := s.db.GetContext(ctx, &ev, `
		SELECT id, title, student_id, buddy_id, type, start_datetime, end_datetime, description, reminder_enabled, created_at, updated_at
		FROM calendar_events WHERE id = $1
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &ev, nil
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM calendar_events WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ListForStudent — события, где student_id = id.
func (s *Service) ListForStudent(ctx context.Context, studentID uuid.UUID, from, to *time.Time, eventType string) ([]models.CalendarEvent, error) {
	return s.list(ctx, "student_id", studentID, from, to, eventType)
}

// ListForBuddy — события Buddy + всех его учеников.
func (s *Service) ListForBuddy(ctx context.Context, buddyID uuid.UUID, from, to *time.Time, eventType, studentFilter string) ([]models.CalendarEvent, error) {
	conds := []string{"(buddy_id = $1 OR student_id IN (SELECT student_id FROM student_buddy_assignments WHERE buddy_id = $1))"}
	args := []any{buddyID}
	idx := 2
	if from != nil {
		conds = append(conds, fmt.Sprintf("start_datetime >= $%d", idx))
		args = append(args, *from)
		idx++
	}
	if to != nil {
		conds = append(conds, fmt.Sprintf("start_datetime < $%d", idx))
		args = append(args, *to)
		idx++
	}
	if eventType != "" {
		conds = append(conds, fmt.Sprintf("type = $%d", idx))
		args = append(args, eventType)
		idx++
	}
	if studentFilter != "" {
		sid, err := uuid.Parse(studentFilter)
		if err == nil {
			conds = append(conds, fmt.Sprintf("student_id = $%d", idx))
			args = append(args, sid)
			idx++
		}
	}
	q := `SELECT id, title, student_id, buddy_id, type, start_datetime, end_datetime, description, reminder_enabled, created_at, updated_at
	      FROM calendar_events WHERE ` + strings.Join(conds, " AND ") + ` ORDER BY start_datetime ASC`
	var out []models.CalendarEvent
	err := s.db.SelectContext(ctx, &out, q, args...)
	return out, err
}

func (s *Service) list(ctx context.Context, scopeCol string, id uuid.UUID, from, to *time.Time, eventType string) ([]models.CalendarEvent, error) {
	conds := []string{fmt.Sprintf("%s = $1", scopeCol)}
	args := []any{id}
	idx := 2
	if from != nil {
		conds = append(conds, fmt.Sprintf("start_datetime >= $%d", idx))
		args = append(args, *from)
		idx++
	}
	if to != nil {
		conds = append(conds, fmt.Sprintf("start_datetime < $%d", idx))
		args = append(args, *to)
		idx++
	}
	if eventType != "" {
		conds = append(conds, fmt.Sprintf("type = $%d", idx))
		args = append(args, eventType)
		idx++
	}
	q := `SELECT id, title, student_id, buddy_id, type, start_datetime, end_datetime, description, reminder_enabled, created_at, updated_at
	      FROM calendar_events WHERE ` + strings.Join(conds, " AND ") + ` ORDER BY start_datetime ASC`
	var out []models.CalendarEvent
	err := s.db.SelectContext(ctx, &out, q, args...)
	return out, err
}

// ====== HTTP ======

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func parseRange(r *http.Request) (*time.Time, *time.Time) {
	q := r.URL.Query()
	var from, to *time.Time
	if v := q.Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = &t
		}
	}
	if v := q.Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = &t
		}
	}
	return from, to
}

// GET /me/calendar — Student/Buddy видит свои события (зависит от роли).
func (h *Handler) MyEvents(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	role, _ := middleware.SelectedRoleFromContext(r.Context())
	from, to := parseRange(r)
	q := r.URL.Query()
	var items []models.CalendarEvent
	var err error
	switch role {
	case string(models.RoleBuddy), string(models.RoleAdmin):
		items, err = h.svc.ListForBuddy(r.Context(), uid, from, to, q.Get("type"), q.Get("student_id"))
	default:
		items, err = h.svc.ListForStudent(r.Context(), uid, from, to, q.Get("type"))
	}
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type createRequest struct {
	Title           string    `json:"title"`
	StudentID       *string   `json:"student_id,omitempty"`
	Type            string    `json:"type"`
	StartDatetime   time.Time `json:"start_datetime"`
	EndDatetime     *time.Time `json:"end_datetime,omitempty"`
	Description     *string    `json:"description,omitempty"`
	ReminderEnabled bool       `json:"reminder_enabled"`
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	buddyID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	in := CreateInput{
		Title:           req.Title,
		BuddyID:         &buddyID,
		Type:            models.CalendarEventType(req.Type),
		StartDatetime:   req.StartDatetime,
		EndDatetime:     req.EndDatetime,
		Description:     req.Description,
		ReminderEnabled: req.ReminderEnabled,
	}
	if req.StudentID != nil {
		sid, err := uuid.Parse(*req.StudentID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_student_id")
			return
		}
		in.StudentID = &sid
	}
	ev, err := h.svc.Create(r.Context(), in)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, ev)
}

type updateRequest struct {
	Title           *string    `json:"title,omitempty"`
	Type            *string    `json:"type,omitempty"`
	StartDatetime   *time.Time `json:"start_datetime,omitempty"`
	EndDatetime     *time.Time `json:"end_datetime,omitempty"`
	Description     *string    `json:"description,omitempty"`
	ReminderEnabled *bool      `json:"reminder_enabled,omitempty"`
}

// canModifyEvent — Admin → всё; Buddy → только свои события.
func (h *Handler) canModifyEvent(r *http.Request, ev *models.CalendarEvent) bool {
	viewerID, _ := middleware.UserIDFromContext(r.Context())
	role, _ := middleware.SelectedRoleFromContext(r.Context())
	if role == string(models.RoleAdmin) {
		return true
	}
	if role == string(models.RoleBuddy) && ev.BuddyID != nil && *ev.BuddyID == viewerID {
		return true
	}
	return false
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	ev, err := h.svc.GetEvent(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	if !h.canModifyEvent(r, ev) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	in := UpdateInput{
		Title:           req.Title,
		StartDatetime:   req.StartDatetime,
		EndDatetime:     req.EndDatetime,
		Description:     req.Description,
		ReminderEnabled: req.ReminderEnabled,
	}
	if req.Type != nil {
		t := models.CalendarEventType(*req.Type)
		in.Type = &t
	}
	updated, err := h.svc.Update(r.Context(), id, in)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	ev, err := h.svc.GetEvent(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	if !h.canModifyEvent(r, ev) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		mapErr(w, err)
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

func mapErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error")
	}
}
