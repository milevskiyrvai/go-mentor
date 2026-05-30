package bonus

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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

// ====== Self ======

type bonusOverview struct {
	Balance         int     `json:"balance"`
	DiscountPercent float64 `json:"discount_percent"`
	DiscountCap     float64 `json:"discount_cap"`
}

func (h *Handler) MyOverview(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	balance, err := h.svc.Balance(r.Context(), uid)
	if err != nil {
		mapErr(w, err)
		return
	}
	pct, err := h.svc.DiscountPercent(r.Context(), uid)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, bonusOverview{Balance: balance, DiscountPercent: pct, DiscountCap: 15})
}

func (h *Handler) MyTransactions(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := h.svc.ListTransactions(r.Context(), uid, limit, offset)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type convertRequest struct {
	BonusAmount int `json:"bonus_amount"`
}

func (h *Handler) Convert(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req convertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	newPct, err := h.svc.ConvertToDiscount(r.Context(), uid, req.BonusAmount)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"discount_percent": newPct})
}

// ====== 1x1 (student) ======

func (h *Handler) CreateOneOnOne(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	req, err := h.svc.CreateOneOnOne(r.Context(), uid)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, req)
}

func (h *Handler) MyOneOnOneList(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.ListOneOnOneByStudent(r.Context(), uid)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ====== 1x1 (admin) ======

func (h *Handler) AdminListOneOnOne(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAllOneOnOne(r.Context(), r.URL.Query().Get("status"))
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type adminActionFunc func(ctx context.Context, id, admin uuid.UUID) (*models.OneOnOneRequest, error)

func (h *Handler) adminAct(w http.ResponseWriter, r *http.Request, fn adminActionFunc) {
	adminID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	req, err := fn(r.Context(), id, adminID)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, req)
}

func (h *Handler) AdminApproveOneOnOne(w http.ResponseWriter, r *http.Request) {
	h.adminAct(w, r, h.svc.ApproveOneOnOne)
}

func (h *Handler) AdminRejectOneOnOne(w http.ResponseWriter, r *http.Request) {
	h.adminAct(w, r, h.svc.RejectOneOnOne)
}

func (h *Handler) AdminCompleteOneOnOne(w http.ResponseWriter, r *http.Request) {
	h.adminAct(w, r, h.svc.CompleteOneOnOne)
}

func (h *Handler) AdminCancelOneOnOne(w http.ResponseWriter, r *http.Request) {
	h.adminAct(w, r, h.svc.CancelOneOnOne)
}

// ====== Manual adjust (admin) ======

type adjustRequest struct {
	UserID string `json:"user_id"`
	Amount int    `json:"amount"`
	Reason string `json:"reason"`
}

func (h *Handler) AdminManualAdjust(w http.ResponseWriter, r *http.Request) {
	var req adjustRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	uid, err := uuid.Parse(req.UserID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_user_id")
		return
	}
	if err := h.svc.ManualAdjust(r.Context(), uid, req.Amount, req.Reason); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ====== helpers ======

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
	case errors.Is(err, ErrInsufficientFunds):
		writeError(w, http.StatusConflict, "insufficient_funds")
	case errors.Is(err, ErrInvalidStatus):
		writeError(w, http.StatusConflict, "invalid_status")
	case errors.Is(err, ErrDiscountCapped):
		writeError(w, http.StatusConflict, "discount_capped")
	case errors.Is(err, ErrInvalidAmount):
		writeError(w, http.StatusBadRequest, "invalid_amount")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error")
	}
}
