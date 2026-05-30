package finals

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/middleware"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/jmoiron/sqlx"
)

var (
	ErrNotFound          = errors.New("not found")
	ErrBlocksNotAllDone  = errors.New("not all blocks approved")
	ErrAlreadyTerminal   = errors.New("already completed or failed")
)

type AchievementTrigger interface {
	EvaluateAll(ctx context.Context, userID uuid.UUID) error
}

type BuddyResolver interface {
	GetBuddyOfStudent(ctx context.Context, studentID uuid.UUID) (*uuid.UUID, error)
}

// Notifier — §19 in-app уведомления.
type Notifier interface {
	Notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, metadata any)
}

type Service struct {
	db       *sqlx.DB
	buddy    BuddyResolver
	trigger  AchievementTrigger
	notifier Notifier
}

func NewService(db *sqlx.DB, buddy BuddyResolver, trigger AchievementTrigger) *Service {
	return &Service{db: db, buddy: buddy, trigger: trigger}
}

func (s *Service) SetNotifier(n Notifier) { s.notifier = n }

func (s *Service) notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, meta any) {
	if s.notifier != nil {
		s.notifier.Notify(ctx, userID, evType, title, body, meta)
	}
}

// availabilityForStudent — определяет, открыты ли финалки.
func (s *Service) availabilityForStudent(ctx context.Context, studentID uuid.UUID) (bool, error) {
	var approved int
	if err := s.db.GetContext(ctx, &approved, `
		SELECT COUNT(*) FROM block_progress WHERE student_id = $1 AND status = 'approved'
	`, studentID); err != nil {
		return false, err
	}
	var total int
	if err := s.db.GetContext(ctx, &total, `
		SELECT COUNT(*) FROM roadmap_blocks WHERE is_active = TRUE AND deleted_at IS NULL
	`); err != nil {
		return false, err
	}
	return total > 0 && approved >= total, nil
}

// List — возвращает обе финалки студента, создавая отсутствующие в нужном статусе.
func (s *Service) List(ctx context.Context, studentID uuid.UUID) ([]models.FinalCheck, error) {
	available, err := s.availabilityForStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}
	defaultStatus := models.FinalNotAvailable
	if available {
		defaultStatus = models.FinalAvailable
	}
	for _, t := range []models.FinalCheckType{models.FinalTechnical, models.FinalRoast} {
		if err := s.ensureRow(ctx, studentID, t, defaultStatus); err != nil {
			return nil, err
		}
	}
	// Пересинхронизируем not_available → available если стало доступно.
	if available {
		if _, err := s.db.ExecContext(ctx, `
			UPDATE final_checks SET status = 'available', updated_at = NOW()
			WHERE student_id = $1 AND status = 'not_available'
		`, studentID); err != nil {
			return nil, err
		}
	}
	var out []models.FinalCheck
	err = s.db.SelectContext(ctx, &out, `
		SELECT id, student_id, buddy_id, type, status, scheduled_at, completed_at, created_at, updated_at
		FROM final_checks WHERE student_id = $1 ORDER BY type
	`, studentID)
	return out, err
}

func (s *Service) ensureRow(ctx context.Context, studentID uuid.UUID, t models.FinalCheckType, status models.FinalCheckStatus) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO final_checks (student_id, type, status) VALUES ($1, $2, $3)
		ON CONFLICT (student_id, type) DO NOTHING
	`, studentID, string(t), string(status))
	return err
}

// Schedule — Buddy/Admin назначает дату финалки.
func (s *Service) Schedule(ctx context.Context, studentID uuid.UUID, t models.FinalCheckType, at time.Time, buddyID uuid.UUID) error {
	if _, err := s.List(ctx, studentID); err != nil {
		return err
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE final_checks
		SET status = 'scheduled', scheduled_at = $3, buddy_id = $4, updated_at = NOW()
		WHERE student_id = $1 AND type = $2 AND status IN ('available','scheduled')
	`, studentID, string(t), at, buddyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	// §19: уведомление ученику о назначенной финалке.
	title := "Назначена финальная техничка"
	if t == models.FinalRoast {
		title = "Назначена финальная прожарка"
	}
	body := "Buddy назначил дату. Подробности в разделе «Мой прогресс»."
	s.notify(ctx, studentID, "final_scheduled", title, &body, map[string]any{
		"type": string(t), "scheduled_at": at,
	})
	return nil
}

// Complete — Buddy/Admin подтверждает прохождение.
func (s *Service) Complete(ctx context.Context, studentID uuid.UUID, t models.FinalCheckType, success bool, buddyID uuid.UUID) error {
	target := models.FinalCompleted
	if !success {
		target = models.FinalFailed
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE final_checks
		SET status = $3, completed_at = NOW(), buddy_id = $4, updated_at = NOW()
		WHERE student_id = $1 AND type = $2 AND status NOT IN ('completed','failed')
	`, studentID, string(t), string(target), buddyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrAlreadyTerminal
	}
	if s.trigger != nil {
		_ = s.trigger.EvaluateAll(ctx, studentID)
	}
	// §19: уведомление о результате финалки.
	title := "Финальная техничка завершена"
	if t == models.FinalRoast {
		title = "Финальная прожарка завершена"
	}
	body := "Результат: " + string(target) + "."
	s.notify(ctx, studentID, "final_completed", title, &body, map[string]any{
		"type": string(t), "result": string(target),
	})
	return nil
}

// ====== HTTP ======

type Handler struct {
	svc   *Service
	buddy BuddyResolver
}

func NewHandler(svc *Service, buddy BuddyResolver) *Handler {
	return &Handler{svc: svc, buddy: buddy}
}

func (h *Handler) MyList(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.List(r.Context(), uid)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) StudentList(w http.ResponseWriter, r *http.Request) {
	studentID, err := uuid.Parse(chi.URLParam(r, "studentID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if !h.canActOnStudent(r, studentID) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	items, err := h.svc.List(r.Context(), studentID)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type scheduleRequest struct {
	StudentID   string    `json:"student_id"`
	Type        string    `json:"type"`
	ScheduledAt time.Time `json:"scheduled_at"`
}

func (h *Handler) Schedule(w http.ResponseWriter, r *http.Request) {
	buddyID, _ := middleware.UserIDFromContext(r.Context())
	var req scheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_student_id")
		return
	}
	if !h.canActOnStudent(r, studentID) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	if err := h.svc.Schedule(r.Context(), studentID, models.FinalCheckType(req.Type), req.ScheduledAt, buddyID); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type completeRequest struct {
	StudentID string `json:"student_id"`
	Type      string `json:"type"`
	Success   bool   `json:"success"`
}

func (h *Handler) Complete(w http.ResponseWriter, r *http.Request) {
	buddyID, _ := middleware.UserIDFromContext(r.Context())
	var req completeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_student_id")
		return
	}
	if !h.canActOnStudent(r, studentID) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	if err := h.svc.Complete(r.Context(), studentID, models.FinalCheckType(req.Type), req.Success, buddyID); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) canActOnStudent(r *http.Request, studentID uuid.UUID) bool {
	viewerID, _ := middleware.UserIDFromContext(r.Context())
	role, _ := middleware.SelectedRoleFromContext(r.Context())
	switch role {
	case string(models.RoleAdmin):
		return true
	case string(models.RoleBuddy):
		buddyID, err := h.buddy.GetBuddyOfStudent(r.Context(), studentID)
		if err == nil && buddyID != nil && *buddyID == viewerID {
			return true
		}
	case string(models.RoleStudent):
		if viewerID == studentID {
			return true
		}
	}
	return false
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
	case errors.Is(err, ErrNotFound), errors.Is(err, sql.ErrNoRows):
		writeError(w, http.StatusNotFound, "not_found")
	case errors.Is(err, ErrAlreadyTerminal):
		writeError(w, http.StatusConflict, "already_terminal")
	case errors.Is(err, ErrBlocksNotAllDone):
		writeError(w, http.StatusConflict, "blocks_not_done")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error")
	}
}
