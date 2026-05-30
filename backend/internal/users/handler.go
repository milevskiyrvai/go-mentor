package users

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/middleware"
	"github.com/itrostik/gomentor/internal/models"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// ----- DTO -----

type UserDTO struct {
	ID                string     `json:"id"`
	Login             string     `json:"login"`
	DisplayName       string     `json:"display_name"`
	AvatarURL         *string    `json:"avatar_url,omitempty"`
	About             *string    `json:"about,omitempty"`
	TelegramUsername  *string    `json:"telegram_username,omitempty"`
	LearningStartedAt *time.Time `json:"learning_started_at,omitempty"`
	IsProfilePrivate  bool       `json:"is_profile_private"`
	IsDeleted         bool       `json:"is_deleted"`
	Roles             []string   `json:"roles"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func toDTO(u *models.User, roles []models.Role) UserDTO {
	rolesStr := make([]string, 0, len(roles))
	for _, r := range roles {
		rolesStr = append(rolesStr, string(r))
	}
	return UserDTO{
		ID:                u.ID.String(),
		Login:             u.Login,
		DisplayName:       u.DisplayName,
		AvatarURL:         u.AvatarURL,
		About:             u.About,
		TelegramUsername:  u.TelegramUsername,
		LearningStartedAt: u.LearningStartedAt,
		IsProfilePrivate:  u.IsProfilePrivate,
		IsDeleted:         u.IsDeleted,
		Roles:             rolesStr,
		CreatedAt:         u.CreatedAt,
		UpdatedAt:         u.UpdatedAt,
	}
}

type listItemDTO struct {
	UserDTO
	BuddyID     *string `json:"buddy_id,omitempty"`
	BuddyName   *string `json:"buddy_name,omitempty"`
	StudentsCnt int     `json:"students_count"`
}

// ----- Self -----

type updateSelfRequest struct {
	DisplayName      *string `json:"display_name,omitempty"`
	AvatarURL        *string `json:"avatar_url,omitempty"`
	About            *string `json:"about,omitempty"`
	IsProfilePrivate *bool   `json:"is_profile_private,omitempty"`
}

func (h *Handler) UpdateSelf(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req updateSelfRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	u, err := h.svc.UpdateSelf(r.Context(), uid, UpdateProfileParams{
		DisplayName:      req.DisplayName,
		AvatarURL:        req.AvatarURL,
		About:            req.About,
		IsProfilePrivate: req.IsProfilePrivate,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	roles, err := h.svc.GetRolesForUser(r.Context(), uid)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toDTO(u, roles))
}

// ----- Public profile -----

type publicProfileDTO struct {
	ID               string     `json:"id"`
	DisplayName      string     `json:"display_name"`
	AvatarURL        *string    `json:"avatar_url,omitempty"`
	TelegramUsername *string    `json:"telegram_username,omitempty"`
	IsProfilePrivate bool       `json:"is_profile_private"`
	About            *string    `json:"about,omitempty"`
	Roles            []string   `json:"roles,omitempty"`
	LearningDays     *int       `json:"learning_days,omitempty"`
	LearningStartAt  *time.Time `json:"learning_started_at,omitempty"`
}

func (h *Handler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	viewerID, _ := middleware.UserIDFromContext(r.Context())
	viewerRole, _ := middleware.SelectedRoleFromContext(r.Context())

	u, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	if u.IsDeleted {
		writeError(w, http.StatusNotFound, "not_found")
		return
	}
	roles, err := h.svc.GetRolesForUser(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}

	// admin видит всё; buddy видит своих учеников полностью; иначе уважаем is_profile_private.
	canSeeAll := viewerRole == string(models.RoleAdmin) || viewerID == id
	if !canSeeAll && viewerRole == string(models.RoleBuddy) {
		buddyID, _ := h.svc.GetBuddyOfStudent(r.Context(), id)
		if buddyID != nil && *buddyID == viewerID {
			canSeeAll = true
		}
	}

	dto := publicProfileDTO{
		ID:               u.ID.String(),
		DisplayName:      u.DisplayName,
		AvatarURL:        u.AvatarURL,
		TelegramUsername: u.TelegramUsername,
		IsProfilePrivate: u.IsProfilePrivate,
	}

	if canSeeAll || !u.IsProfilePrivate {
		dto.About = u.About
		rs := make([]string, 0, len(roles))
		for _, r := range roles {
			rs = append(rs, string(r))
		}
		dto.Roles = rs
		if u.LearningStartedAt != nil {
			dto.LearningStartAt = u.LearningStartedAt
			d := int(time.Since(*u.LearningStartedAt).Hours() / 24)
			dto.LearningDays = &d
		}
	}

	writeJSON(w, http.StatusOK, dto)
}

// ----- Admin: create/list/get/update/delete/reset-password/assign-buddy -----

type adminCreateRequest struct {
	Login             string     `json:"login"`
	Password          string     `json:"password"`
	DisplayName       string     `json:"display_name"`
	TelegramUsername  *string    `json:"telegram_username,omitempty"`
	LearningStartedAt *time.Time `json:"learning_started_at,omitempty"`
	Roles             []string   `json:"roles"`
}

func (h *Handler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	var req adminCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	u, err := h.svc.Create(r.Context(), CreateInput{
		Login:             req.Login,
		Password:          req.Password,
		DisplayName:       req.DisplayName,
		TelegramUsername:  req.TelegramUsername,
		LearningStartedAt: req.LearningStartedAt,
		Roles:             req.Roles,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	roles, _ := h.svc.GetRolesForUser(r.Context(), u.ID)
	writeJSON(w, http.StatusCreated, toDTO(u, roles))
}

func (h *Handler) AdminList(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	f := ListFilter{
		Role:           q.Get("role"),
		IncludeDeleted: q.Get("include_deleted") == "true",
		Search:         q.Get("q"),
		Limit:          limit,
		Offset:         offset,
	}
	items, err := h.svc.List(r.Context(), f)
	if err != nil {
		mapErr(w, err)
		return
	}
	out := make([]listItemDTO, 0, len(items))
	for _, it := range items {
		dto := listItemDTO{
			UserDTO:     toDTO(&it.User, it.Roles),
			StudentsCnt: it.StudentCnt,
		}
		if it.BuddyID != nil {
			s := it.BuddyID.String()
			dto.BuddyID = &s
		}
		dto.BuddyName = it.BuddyName
		out = append(out, dto)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *Handler) AdminGet(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	u, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	roles, _ := h.svc.GetRolesForUser(r.Context(), id)
	writeJSON(w, http.StatusOK, toDTO(u, roles))
}

type adminUpdateRequest struct {
	DisplayName       *string    `json:"display_name,omitempty"`
	TelegramUsername  *string    `json:"telegram_username,omitempty"`
	LearningStartedAt *time.Time `json:"learning_started_at,omitempty"`
	Roles             *[]string  `json:"roles,omitempty"`
}

func (h *Handler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	var req adminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	u, err := h.svc.AdminUpdate(r.Context(), id, AdminUpdateInput{
		DisplayName:       req.DisplayName,
		TelegramUsername:  req.TelegramUsername,
		LearningStartedAt: req.LearningStartedAt,
		Roles:             req.Roles,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	roles, _ := h.svc.GetRolesForUser(r.Context(), u.ID)
	writeJSON(w, http.StatusOK, toDTO(u, roles))
}

func (h *Handler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// AdminRestore — §4.4: восстанавливает soft-deleted пользователя.
func (h *Handler) AdminRestore(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if err := h.svc.Restore(r.Context(), id); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type resetPasswordRequest struct {
	NewPassword string `json:"new_password"`
}

func (h *Handler) AdminResetPassword(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if err := h.svc.ResetPassword(r.Context(), id, req.NewPassword); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type assignBuddyRequest struct {
	BuddyID string `json:"buddy_id"`
}

func (h *Handler) AdminAssignBuddy(w http.ResponseWriter, r *http.Request) {
	studentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	var req assignBuddyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	buddyID, err := uuid.Parse(req.BuddyID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_buddy_id")
		return
	}
	if err := h.svc.AssignBuddy(r.Context(), studentID, buddyID); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ----- Buddy: my students -----

type buddyStudentDTO struct {
	ID                string     `json:"id"`
	Login             string     `json:"login"`
	DisplayName       string     `json:"display_name"`
	AvatarURL         *string    `json:"avatar_url,omitempty"`
	About             *string    `json:"about,omitempty"`
	TelegramUsername  *string    `json:"telegram_username,omitempty"`
	LearningStartedAt *time.Time `json:"learning_started_at,omitempty"`
	IsProfilePrivate  bool       `json:"is_profile_private"`
	ApprovedBlocks    int        `json:"approved_blocks"`
	WaitingBlocks     int        `json:"waiting_blocks"`
	TotalBlocks       int        `json:"total_blocks"`
	TotalRequired     int        `json:"total_required"`
	ViewedRequired    int        `json:"viewed_required"`
	OverallPercent    int        `json:"overall_percent"`
	LastActivityAt    *time.Time `json:"last_activity_at,omitempty"`
}

func (h *Handler) BuddyMyStudents(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.ListStudentSummariesOfBuddy(r.Context(), uid)
	if err != nil {
		mapErr(w, err)
		return
	}
	out := make([]buddyStudentDTO, 0, len(items))
	for _, s := range items {
		pct := 0
		if s.TotalRequired > 0 {
			pct = s.ViewedRequired * 100 / s.TotalRequired
		}
		out = append(out, buddyStudentDTO{
			ID:                s.ID.String(),
			Login:             s.Login,
			DisplayName:       s.DisplayName,
			AvatarURL:         s.AvatarURL,
			About:             s.About,
			TelegramUsername:  s.TelegramUsername,
			LearningStartedAt: s.LearningStartAt,
			IsProfilePrivate:  s.IsPrivate,
			ApprovedBlocks:    s.ApprovedBlocks,
			WaitingBlocks:     s.WaitingBlocks,
			TotalBlocks:       s.TotalBlocks,
			TotalRequired:     s.TotalRequired,
			ViewedRequired:    s.ViewedRequired,
			OverallPercent:    pct,
			LastActivityAt:    s.LastActivityAt,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *Handler) AdminUnassignBuddy(w http.ResponseWriter, r *http.Request) {
	studentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if err := h.svc.UnassignBuddy(r.Context(), studentID); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ----- helpers -----

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
	case errors.Is(err, ErrLoginTaken):
		writeError(w, http.StatusConflict, "login_taken")
	case errors.Is(err, ErrTelegramTaken):
		writeError(w, http.StatusConflict, "telegram_taken")
	case errors.Is(err, ErrInvalidRole):
		writeError(w, http.StatusBadRequest, "invalid_role")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error")
	}
}
