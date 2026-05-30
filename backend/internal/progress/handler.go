package progress

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/middleware"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/itrostik/gomentor/internal/roadmap"
)

// BuddyResolver — нужен чтобы Buddy мог смотреть прогресс только своих учеников.
type BuddyResolver interface {
	GetBuddyOfStudent(ctx context.Context, studentID uuid.UUID) (*uuid.UUID, error)
}

type Handler struct {
	svc        *Service
	roadmap    *roadmap.Service
	usersBuddy BuddyResolver
}

func NewHandler(svc *Service, roadmapSvc *roadmap.Service, buddy BuddyResolver) *Handler {
	return &Handler{svc: svc, roadmap: roadmapSvc, usersBuddy: buddy}
}

// ====== Student actions ======

func (h *Handler) MarkMaterialViewed(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	materialID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if err := h.svc.MarkViewed(r.Context(), uid, materialID); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) UnmarkMaterialViewed(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	materialID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if err := h.svc.UnmarkViewed(r.Context(), uid, materialID); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ====== Progress read ======

func (h *Handler) MyProgress(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	h.writeSummary(w, r.Context(), uid)
}

func (h *Handler) GetStudentProgress(w http.ResponseWriter, r *http.Request) {
	viewerID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	viewerRole, _ := middleware.SelectedRoleFromContext(r.Context())
	studentID, err := uuid.Parse(chi.URLParam(r, "studentID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}

	allowed := false
	switch viewerRole {
	case string(models.RoleAdmin):
		allowed = true
	case string(models.RoleBuddy):
		buddy, _ := h.usersBuddy.GetBuddyOfStudent(r.Context(), studentID)
		if buddy != nil && *buddy == viewerID {
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

	h.writeSummary(w, r.Context(), studentID)
}

func (h *Handler) writeSummary(w http.ResponseWriter, ctx context.Context, studentID uuid.UUID) {
	blocks, err := h.roadmap.ListBlocks(ctx, false)
	if err != nil {
		mapErr(w, err)
		return
	}
	blockIDs := make([]uuid.UUID, 0, len(blocks))
	for _, b := range blocks {
		blockIDs = append(blockIDs, b.ID)
	}
	summary, err := h.svc.Summary(ctx, studentID, blockIDs)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

// ====== Buddy/Admin: approve block ======

type approveBlockRequest struct {
	StudentID string `json:"student_id"`
}

func (h *Handler) ApproveBlock(w http.ResponseWriter, r *http.Request) {
	approverID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	role, _ := middleware.SelectedRoleFromContext(r.Context())
	blockID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	var req approveBlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_student_id")
		return
	}

	// Buddy может подтверждать только своих; Admin — всех.
	if role == string(models.RoleBuddy) {
		buddy, _ := h.usersBuddy.GetBuddyOfStudent(r.Context(), studentID)
		if buddy == nil || *buddy != approverID {
			writeError(w, http.StatusForbidden, "not_your_student")
			return
		}
	} else if role != string(models.RoleAdmin) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	if err := h.svc.ApproveBlock(r.Context(), studentID, blockID, approverID); err != nil {
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
	case errors.Is(err, ErrAlreadyApproved):
		writeError(w, http.StatusConflict, "already_approved")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error")
	}
}
