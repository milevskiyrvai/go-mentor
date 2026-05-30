package achievements

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/middleware"
)

type Handler struct {
	svc           *Service
	statsProvider StatsProvider
}

func NewHandler(svc *Service, sp StatsProvider) *Handler {
	return &Handler{svc: svc, statsProvider: sp}
}

// ====== Public list (catalog) ======

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	includeInactive := r.URL.Query().Get("include_inactive") == "true"
	items, err := h.svc.List(r.Context(), includeInactive)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ====== My progress ======

func (h *Handler) MyProgress(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	stats, err := h.statsProvider.CollectStats(r.Context(), uid)
	if err != nil {
		mapErr(w, err)
		return
	}
	items, err := h.svc.ProgressForUser(r.Context(), uid, stats)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// User-specific (for public profile)
func (h *Handler) UserAchievements(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	items, err := h.svc.UserAchievements(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ====== Admin CRUD ======

type createRequest struct {
	Title           string          `json:"title"`
	Description     *string         `json:"description,omitempty"`
	RewardBonus     int             `json:"reward_bonus"`
	ImageURL        *string         `json:"image_url,omitempty"`
	ConditionType   string          `json:"condition_type"`
	ConditionParams json.RawMessage `json:"condition_params,omitempty"`
}

func (h *Handler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	a, err := h.svc.Create(r.Context(), CreateParams{
		Title:           req.Title,
		Description:     req.Description,
		RewardBonus:     req.RewardBonus,
		ImageURL:        req.ImageURL,
		ConditionType:   req.ConditionType,
		ConditionParams: req.ConditionParams,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

type updateRequest struct {
	Title           *string          `json:"title,omitempty"`
	Description     *string          `json:"description,omitempty"`
	RewardBonus     *int             `json:"reward_bonus,omitempty"`
	ImageURL        *string          `json:"image_url,omitempty"`
	ConditionType   *string          `json:"condition_type,omitempty"`
	ConditionParams *json.RawMessage `json:"condition_params,omitempty"`
	IsActive        *bool            `json:"is_active,omitempty"`
}

func (h *Handler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	a, err := h.svc.Update(r.Context(), id, UpdateParams{
		Title:           req.Title,
		Description:     req.Description,
		RewardBonus:     req.RewardBonus,
		ImageURL:        req.ImageURL,
		ConditionType:   req.ConditionType,
		ConditionParams: req.ConditionParams,
		IsActive:        req.IsActive,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (h *Handler) AdminListUsers(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	ids, err := h.svc.UsersWithAchievement(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user_ids": ids})
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
