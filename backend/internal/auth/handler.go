package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/itrostik/gomentor/internal/middleware"
	"github.com/itrostik/gomentor/internal/models"
)

type Handler struct {
	svc      *Service
	isSecure bool
}

func NewHandler(svc *Service, isSecure bool) *Handler {
	return &Handler{svc: svc, isSecure: isSecure}
}

type loginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type userResponse struct {
	ID               string  `json:"id"`
	Login            string  `json:"login"`
	DisplayName      string  `json:"display_name"`
	AvatarURL        *string `json:"avatar_url,omitempty"`
	About            *string `json:"about,omitempty"`
	TelegramUsername *string `json:"telegram_username,omitempty"`
	IsProfilePrivate bool    `json:"is_profile_private"`
}

func toUserResponse(u *models.User) userResponse {
	return userResponse{
		ID:               u.ID.String(),
		Login:            u.Login,
		DisplayName:      u.DisplayName,
		AvatarURL:        u.AvatarURL,
		About:            u.About,
		TelegramUsername: u.TelegramUsername,
		IsProfilePrivate: u.IsProfilePrivate,
	}
}

type loginResponse struct {
	User         userResponse `json:"user"`
	Roles        []string     `json:"roles"`
	SelectedRole string       `json:"selected_role,omitempty"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if req.Login == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "login_and_password_required")
		return
	}

	res, err := h.svc.Login(r.Context(), req.Login, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid_credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}

	h.setSessionCookie(w, res.Token)

	rolesStr := make([]string, 0, len(res.Roles))
	for _, role := range res.Roles {
		rolesStr = append(rolesStr, string(role))
	}

	writeJSON(w, http.StatusOK, loginResponse{
		User:         toUserResponse(res.User),
		Roles:        rolesStr,
		SelectedRole: res.SelectedRole,
	})
}

type selectRoleRequest struct {
	Role string `json:"role"`
}

func (h *Handler) SelectRole(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req selectRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}

	token, err := h.svc.SelectRole(r.Context(), userID, models.Role(req.Role))
	if err != nil {
		if errors.Is(err, ErrRoleNotAvailable) {
			writeError(w, http.StatusForbidden, "role_not_available")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}

	h.setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, map[string]string{"selected_role": req.Role})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.isSecure,
		SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

type meResponse struct {
	User         userResponse `json:"user"`
	Roles        []string     `json:"roles"`
	SelectedRole string       `json:"selected_role,omitempty"`
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	selectedRole, _ := middleware.SelectedRoleFromContext(r.Context())

	user, roles, err := h.svc.Me(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error")
		return
	}

	rolesStr := make([]string, 0, len(roles))
	for _, role := range roles {
		rolesStr = append(rolesStr, string(role))
	}

	writeJSON(w, http.StatusOK, meResponse{
		User:         toUserResponse(user),
		Roles:        rolesStr,
		SelectedRole: selectedRole,
	})
}

func (h *Handler) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(SessionDuration),
		MaxAge:   int(SessionDuration.Seconds()),
		HttpOnly: true,
		Secure:   h.isSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
