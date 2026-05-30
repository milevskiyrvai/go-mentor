package roadmap

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/jmoiron/sqlx"
)

var ErrNotFound = errors.New("not found")

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// ============ Blocks ============

func (r *Repository) ListBlocks(ctx context.Context, includeInactive bool) ([]models.RoadmapBlock, error) {
	cond := "WHERE deleted_at IS NULL"
	if !includeInactive {
		cond += " AND is_active = TRUE"
	}
	q := fmt.Sprintf(`
		SELECT id, title, description, sort_order, is_active, deleted_at, created_at, updated_at
		FROM roadmap_blocks %s ORDER BY sort_order ASC, created_at ASC
	`, cond)
	var blocks []models.RoadmapBlock
	if err := r.db.SelectContext(ctx, &blocks, q); err != nil {
		return nil, err
	}
	return blocks, nil
}

func (r *Repository) GetBlock(ctx context.Context, id uuid.UUID) (*models.RoadmapBlock, error) {
	var b models.RoadmapBlock
	err := r.db.GetContext(ctx, &b, `
		SELECT id, title, description, sort_order, is_active, deleted_at, created_at, updated_at
		FROM roadmap_blocks WHERE id = $1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &b, nil
}

func (r *Repository) CreateBlock(ctx context.Context, title, description string) (*models.RoadmapBlock, error) {
	var b models.RoadmapBlock
	err := r.db.GetContext(ctx, &b, `
		INSERT INTO roadmap_blocks (title, description, sort_order)
		VALUES ($1, NULLIF($2, ''), COALESCE((SELECT MAX(sort_order)+1 FROM roadmap_blocks), 0))
		RETURNING id, title, description, sort_order, is_active, deleted_at, created_at, updated_at
	`, title, description)
	return &b, err
}

type UpdateBlockParams struct {
	Title       *string
	Description *string
	IsActive    *bool
}

func (r *Repository) UpdateBlock(ctx context.Context, id uuid.UUID, p UpdateBlockParams) (*models.RoadmapBlock, error) {
	sets := []string{}
	args := []any{}
	idx := 1
	if p.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", idx))
		args = append(args, *p.Title)
		idx++
	}
	if p.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", idx))
		args = append(args, *p.Description)
		idx++
	}
	if p.IsActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", idx))
		args = append(args, *p.IsActive)
		idx++
	}
	if len(sets) == 0 {
		return r.GetBlock(ctx, id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	q := fmt.Sprintf(`
		UPDATE roadmap_blocks SET %s
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id, title, description, sort_order, is_active, deleted_at, created_at, updated_at
	`, strings.Join(sets, ", "), idx)
	var b models.RoadmapBlock
	err := r.db.GetContext(ctx, &b, q, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &b, nil
}

func (r *Repository) SoftDeleteBlock(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE roadmap_blocks SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) ReorderBlocks(ctx context.Context, orderedIDs []uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i, id := range orderedIDs {
		if _, err := tx.ExecContext(ctx, `UPDATE roadmap_blocks SET sort_order = $1, updated_at = NOW() WHERE id = $2`, i, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ============ Materials ============

func (r *Repository) ListMaterialsByBlock(ctx context.Context, blockID uuid.UUID, includeInactive bool) ([]models.RoadmapMaterial, error) {
	cond := "WHERE block_id = $1 AND deleted_at IS NULL"
	if !includeInactive {
		cond += " AND is_active = TRUE"
	}
	q := fmt.Sprintf(`
		SELECT id, block_id, title, description, type, content_type, url, content,
		       preview_title, preview_description, preview_image, source,
		       is_required, is_active, sort_order, deleted_at, created_at, updated_at
		FROM roadmap_materials %s ORDER BY sort_order ASC, created_at ASC
	`, cond)
	var out []models.RoadmapMaterial
	if err := r.db.SelectContext(ctx, &out, q, blockID); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repository) GetMaterial(ctx context.Context, id uuid.UUID) (*models.RoadmapMaterial, error) {
	var m models.RoadmapMaterial
	err := r.db.GetContext(ctx, &m, `
		SELECT id, block_id, title, description, type, content_type, url, content,
		       preview_title, preview_description, preview_image, source,
		       is_required, is_active, sort_order, deleted_at, created_at, updated_at
		FROM roadmap_materials WHERE id = $1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &m, nil
}

type CreateMaterialParams struct {
	BlockID            uuid.UUID
	Title              string
	Description        *string
	Type               models.MaterialType
	ContentType        models.ContentType
	URL                *string
	Content            *string
	PreviewTitle       *string
	PreviewDescription *string
	PreviewImage       *string
	Source             *string
	IsRequired         bool
}

func (r *Repository) CreateMaterial(ctx context.Context, p CreateMaterialParams) (*models.RoadmapMaterial, error) {
	var m models.RoadmapMaterial
	err := r.db.GetContext(ctx, &m, `
		INSERT INTO roadmap_materials (
		  block_id, title, description, type, content_type, url, content,
		  preview_title, preview_description, preview_image, source, is_required,
		  sort_order
		) VALUES (
		  $1, $2, $3, $4, $5, $6, $7,
		  $8, $9, $10, $11, $12,
		  COALESCE((SELECT MAX(sort_order)+1 FROM roadmap_materials WHERE block_id = $1), 0)
		)
		RETURNING id, block_id, title, description, type, content_type, url, content,
		          preview_title, preview_description, preview_image, source,
		          is_required, is_active, sort_order, deleted_at, created_at, updated_at
	`,
		p.BlockID, p.Title, p.Description, string(p.Type), string(p.ContentType),
		p.URL, p.Content, p.PreviewTitle, p.PreviewDescription, p.PreviewImage,
		p.Source, p.IsRequired,
	)
	return &m, err
}

type UpdateMaterialParams struct {
	Title              *string
	Description        *string
	Type               *models.MaterialType
	ContentType        *models.ContentType
	URL                *string
	Content            *string
	PreviewTitle       *string
	PreviewDescription *string
	PreviewImage       *string
	Source             *string
	IsRequired         *bool
	IsActive           *bool
}

func (r *Repository) UpdateMaterial(ctx context.Context, id uuid.UUID, p UpdateMaterialParams) (*models.RoadmapMaterial, error) {
	sets := []string{}
	args := []any{}
	idx := 1
	add := func(col string, v any) {
		sets = append(sets, fmt.Sprintf("%s = $%d", col, idx))
		args = append(args, v)
		idx++
	}
	if p.Title != nil {
		add("title", *p.Title)
	}
	if p.Description != nil {
		add("description", *p.Description)
	}
	if p.Type != nil {
		add("type", string(*p.Type))
	}
	if p.ContentType != nil {
		add("content_type", string(*p.ContentType))
	}
	if p.URL != nil {
		add("url", *p.URL)
	}
	if p.Content != nil {
		add("content", *p.Content)
	}
	if p.PreviewTitle != nil {
		add("preview_title", *p.PreviewTitle)
	}
	if p.PreviewDescription != nil {
		add("preview_description", *p.PreviewDescription)
	}
	if p.PreviewImage != nil {
		add("preview_image", *p.PreviewImage)
	}
	if p.Source != nil {
		add("source", *p.Source)
	}
	if p.IsRequired != nil {
		add("is_required", *p.IsRequired)
	}
	if p.IsActive != nil {
		add("is_active", *p.IsActive)
	}
	if len(sets) == 0 {
		return r.GetMaterial(ctx, id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	q := fmt.Sprintf(`
		UPDATE roadmap_materials SET %s
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id, block_id, title, description, type, content_type, url, content,
		          preview_title, preview_description, preview_image, source,
		          is_required, is_active, sort_order, deleted_at, created_at, updated_at
	`, strings.Join(sets, ", "), idx)
	var m models.RoadmapMaterial
	if err := r.db.GetContext(ctx, &m, q, args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &m, nil
}

func (r *Repository) SoftDeleteMaterial(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE roadmap_materials SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) ReorderMaterials(ctx context.Context, blockID uuid.UUID, orderedIDs []uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i, id := range orderedIDs {
		if _, err := tx.ExecContext(ctx, `
			UPDATE roadmap_materials SET sort_order = $1, updated_at = NOW()
			WHERE id = $2 AND block_id = $3
		`, i, id, blockID); err != nil {
			return err
		}
	}
	return tx.Commit()
}
