package interviews

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/middleware"
	"github.com/itrostik/gomentor/internal/models"
)

type Handler struct {
	svc   *Service
	buddy BuddyResolver
}

func NewHandler(svc *Service, buddy BuddyResolver) *Handler {
	return &Handler{svc: svc, buddy: buddy}
}

// ====== Student: real ======

type addRealRequest struct {
	URL      string     `json:"url"`
	Company  *string    `json:"company,omitempty"`
	Position *string    `json:"position,omitempty"`
	Grade    *string    `json:"grade,omitempty"`
	Stack    *string    `json:"stack,omitempty"`
	Date     *time.Time `json:"date,omitempty"`
	Result   *string    `json:"result,omitempty"`
}

func (h *Handler) AddReal(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req addRealRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	iv, err := h.svc.AddReal(r.Context(), AddRealInput{
		StudentID: uid,
		URL:       req.URL,
		Company:   req.Company,
		Position:  req.Position,
		Grade:     req.Grade,
		Stack:     req.Stack,
		Date:      req.Date,
		Result:    req.Result,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, iv)
}

// ====== Student: mine list ======

func (h *Handler) MyList(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.ListMine(r.Context(), uid, r.URL.Query().Get("type"))
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ====== Buddy/Admin: список всех собеседований ученика ======

func (h *Handler) StudentInterviews(w http.ResponseWriter, r *http.Request) {
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

	items, err := h.svc.ListMine(r.Context(), studentID, r.URL.Query().Get("type"))
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ====== Catalog (any authed) ======

func (h *Handler) Catalog(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	items, err := h.svc.ListCatalog(r.Context(), q.Get("company"), q.Get("grade"), q.Get("result"))
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ====== Buddy: mock create + complete + feedback ======

type createMockRequest struct {
	StudentID string     `json:"student_id"`
	Company   *string    `json:"company,omitempty"`
	Position  *string    `json:"position,omitempty"`
	Grade     *string    `json:"grade,omitempty"`
	Stack     *string    `json:"stack,omitempty"`
	Date      *time.Time `json:"date,omitempty"`
}

func (h *Handler) BuddyCreateMock(w http.ResponseWriter, r *http.Request) {
	buddyID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req createMockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_student_id")
		return
	}
	// Buddy создаёт только для своих учеников; Admin — всегда.
	if role, _ := middleware.SelectedRoleFromContext(r.Context()); role == string(models.RoleBuddy) {
		actualBuddy, _ := h.buddy.GetBuddyOfStudent(r.Context(), studentID)
		if actualBuddy == nil || *actualBuddy != buddyID {
			writeError(w, http.StatusForbidden, "not_your_student")
			return
		}
	}
	iv, err := h.svc.CreateMock(r.Context(), CreateMockInput{
		StudentID: studentID,
		BuddyID:   buddyID,
		Company:   req.Company,
		Position:  req.Position,
		Grade:     req.Grade,
		Stack:     req.Stack,
		Date:      req.Date,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, iv)
}

type completeMockRequest struct {
	Feedback string `json:"feedback"`
}

func (h *Handler) BuddyCompleteMock(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	var req completeMockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	iv, err := h.svc.CompleteMock(r.Context(), id, req.Feedback)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, iv)
}

// ====== Update (Buddy редактирует фидбэк/результат) ======

type updateRequest struct {
	URL      *string    `json:"url,omitempty"`
	Company  *string    `json:"company,omitempty"`
	Position *string    `json:"position,omitempty"`
	Grade    *string    `json:"grade,omitempty"`
	Stack    *string    `json:"stack,omitempty"`
	Date     *time.Time `json:"date,omitempty"`
	Status   *string    `json:"status,omitempty"`
	Result   *string    `json:"result,omitempty"`
	Feedback *string    `json:"feedback,omitempty"`
}

// canModifyInterview — Admin → всё; Buddy → собеседования своих учеников; Student → свои real.
func (h *Handler) canModifyInterview(r *http.Request, iv *models.Interview) bool {
	viewerID, _ := middleware.UserIDFromContext(r.Context())
	role, _ := middleware.SelectedRoleFromContext(r.Context())
	switch role {
	case string(models.RoleAdmin):
		return true
	case string(models.RoleBuddy):
		buddyID, _ := h.buddy.GetBuddyOfStudent(r.Context(), iv.StudentID)
		return buddyID != nil && *buddyID == viewerID
	case string(models.RoleStudent):
		return iv.StudentID == viewerID && iv.Type == models.InterviewReal
	}
	return false
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	iv, err := h.svc.Get(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	if !h.canModifyInterview(r, iv) {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	updated, err := h.svc.Update(r.Context(), id, UpdateParams{
		URL: req.URL, Company: req.Company, Position: req.Position,
		Grade: req.Grade, Stack: req.Stack, Date: req.Date,
		Status: req.Status, Result: req.Result, Feedback: req.Feedback,
	})
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
	iv, err := h.svc.Get(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	if !h.canModifyInterview(r, iv) {
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
	case errors.Is(err, ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_input")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error")
	}
}
