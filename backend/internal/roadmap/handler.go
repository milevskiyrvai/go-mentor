package roadmap

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// ============ Public (any authed) read ============

func (h *Handler) ListBlocks(w http.ResponseWriter, r *http.Request) {
	includeInactive := r.URL.Query().Get("include_inactive") == "true"
	blocks, err := h.svc.ListBlocks(r.Context(), includeInactive)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": blocks})
}

func (h *Handler) GetBlock(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	block, err := h.svc.GetBlock(r.Context(), id)
	if err != nil {
		mapErr(w, err)
		return
	}
	includeInactive := r.URL.Query().Get("include_inactive") == "true"
	materials, err := h.svc.ListMaterials(r.Context(), id, includeInactive)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"block":     block,
		"materials": materials,
	})
}

// ============ Admin: blocks ============

type createBlockRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

func (h *Handler) AdminCreateBlock(w http.ResponseWriter, r *http.Request) {
	var req createBlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	b, err := h.svc.CreateBlock(r.Context(), req.Title, req.Description)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, b)
}

type updateBlockRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

func (h *Handler) AdminUpdateBlock(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	var req updateBlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	b, err := h.svc.UpdateBlock(r.Context(), id, UpdateBlockParams{
		Title:       req.Title,
		Description: req.Description,
		IsActive:    req.IsActive,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
}

func (h *Handler) AdminDeleteBlock(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if err := h.svc.DeleteBlock(r.Context(), id); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type reorderRequest struct {
	OrderedIDs []string `json:"ordered_ids"`
}

func (h *Handler) AdminReorderBlocks(w http.ResponseWriter, r *http.Request) {
	var req reorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	ids, err := parseUUIDs(req.OrderedIDs)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_ids")
		return
	}
	if err := h.svc.ReorderBlocks(r.Context(), ids); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ============ Admin: materials ============

type createMaterialRequest struct {
	BlockID            string  `json:"block_id"`
	Title              string  `json:"title"`
	Description        *string `json:"description,omitempty"`
	Type               string  `json:"type"`
	ContentType        string  `json:"content_type"`
	URL                *string `json:"url,omitempty"`
	Content            *string `json:"content,omitempty"`
	PreviewTitle       *string `json:"preview_title,omitempty"`
	PreviewDescription *string `json:"preview_description,omitempty"`
	PreviewImage       *string `json:"preview_image,omitempty"`
	Source             *string `json:"source,omitempty"`
	IsRequired         bool    `json:"is_required"`
}

func (h *Handler) AdminCreateMaterial(w http.ResponseWriter, r *http.Request) {
	var req createMaterialRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	blockID, err := uuid.Parse(req.BlockID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_block_id")
		return
	}
	m, err := h.svc.CreateMaterial(r.Context(), CreateMaterialParams{
		BlockID:            blockID,
		Title:              req.Title,
		Description:        req.Description,
		Type:               models.MaterialType(req.Type),
		ContentType:        models.ContentType(req.ContentType),
		URL:                req.URL,
		Content:            req.Content,
		PreviewTitle:       req.PreviewTitle,
		PreviewDescription: req.PreviewDescription,
		PreviewImage:       req.PreviewImage,
		Source:             req.Source,
		IsRequired:         req.IsRequired,
	})
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

type updateMaterialRequest struct {
	Title              *string `json:"title,omitempty"`
	Description        *string `json:"description,omitempty"`
	Type               *string `json:"type,omitempty"`
	ContentType        *string `json:"content_type,omitempty"`
	URL                *string `json:"url,omitempty"`
	Content            *string `json:"content,omitempty"`
	PreviewTitle       *string `json:"preview_title,omitempty"`
	PreviewDescription *string `json:"preview_description,omitempty"`
	PreviewImage       *string `json:"preview_image,omitempty"`
	Source             *string `json:"source,omitempty"`
	IsRequired         *bool   `json:"is_required,omitempty"`
	IsActive           *bool   `json:"is_active,omitempty"`
}

func (h *Handler) AdminUpdateMaterial(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	var req updateMaterialRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	p := UpdateMaterialParams{
		Title:              req.Title,
		Description:        req.Description,
		URL:                req.URL,
		Content:            req.Content,
		PreviewTitle:       req.PreviewTitle,
		PreviewDescription: req.PreviewDescription,
		PreviewImage:       req.PreviewImage,
		Source:             req.Source,
		IsRequired:         req.IsRequired,
		IsActive:           req.IsActive,
	}
	if req.Type != nil {
		t := models.MaterialType(*req.Type)
		p.Type = &t
	}
	if req.ContentType != nil {
		c := models.ContentType(*req.ContentType)
		p.ContentType = &c
	}
	m, err := h.svc.UpdateMaterial(r.Context(), id, p)
	if err != nil {
		mapErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (h *Handler) AdminDeleteMaterial(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id")
		return
	}
	if err := h.svc.DeleteMaterial(r.Context(), id); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type reorderMaterialsRequest struct {
	BlockID    string   `json:"block_id"`
	OrderedIDs []string `json:"ordered_ids"`
}

func (h *Handler) AdminReorderMaterials(w http.ResponseWriter, r *http.Request) {
	var req reorderMaterialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	blockID, err := uuid.Parse(req.BlockID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_block_id")
		return
	}
	ids, err := parseUUIDs(req.OrderedIDs)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_ids")
		return
	}
	if err := h.svc.ReorderMaterials(r.Context(), blockID, ids); err != nil {
		mapErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Auto-fetch preview endpoint — Admin форма перед сохранением может дёрнуть его.
type previewRequest struct {
	URL string `json:"url"`
}

func (h *Handler) AdminFetchPreview(w http.ResponseWriter, r *http.Request) {
	var req previewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	if req.URL == "" {
		writeError(w, http.StatusBadRequest, "url_required")
		return
	}
	p, err := FetchPreview(r.Context(), req.URL)
	if err != nil || p == nil {
		writeJSON(w, http.StatusOK, map[string]any{})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"title":       p.Title,
		"description": p.Description,
		"image":       p.Image,
		"source":      p.Source,
	})
}

// helpers

func parseUUIDs(ss []string) ([]uuid.UUID, error) {
	out := make([]uuid.UUID, 0, len(ss))
	for _, s := range ss {
		id, err := uuid.Parse(s)
		if err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, nil
}

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
