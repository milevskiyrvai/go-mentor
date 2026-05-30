package progress

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

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

// MarkMaterialViewed — upsert просмотра. Возвращает true если запись была создана новой.
func (r *Repository) MarkMaterialViewed(ctx context.Context, studentID, materialID uuid.UUID) (bool, error) {
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO material_progress (student_id, material_id)
		VALUES ($1, $2)
		ON CONFLICT (student_id, material_id) DO NOTHING
	`, studentID, materialID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (r *Repository) UnmarkMaterialViewed(ctx context.Context, studentID, materialID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM material_progress WHERE student_id = $1 AND material_id = $2
	`, studentID, materialID)
	return err
}

func (r *Repository) ListViewedMaterials(ctx context.Context, studentID uuid.UUID) ([]models.MaterialProgress, error) {
	var out []models.MaterialProgress
	err := r.db.SelectContext(ctx, &out, `
		SELECT id, student_id, material_id, viewed_at, created_at
		FROM material_progress WHERE student_id = $1
	`, studentID)
	return out, err
}

type MaterialCounts struct {
	BlockID         uuid.UUID `db:"block_id"`
	TotalRequired   int       `db:"total_required"`
	ViewedRequired  int       `db:"viewed_required"`
	TotalAll        int       `db:"total_all"`
	ViewedAll       int       `db:"viewed_all"`
	TotalActiveAll  int       `db:"total_active_all"`
	ViewedActiveAll int       `db:"viewed_active_all"`
}

// CountMaterialsForBlock — считает по конкретному блоку.
func (r *Repository) CountMaterialsForBlock(ctx context.Context, studentID, blockID uuid.UUID) (*MaterialCounts, error) {
	var c MaterialCounts
	err := r.db.GetContext(ctx, &c, `
		SELECT
		  $2::uuid AS block_id,
		  COUNT(*) FILTER (WHERE m.is_required AND m.is_active AND m.deleted_at IS NULL) AS total_required,
		  COUNT(*) FILTER (WHERE m.is_required AND m.is_active AND m.deleted_at IS NULL AND mp.id IS NOT NULL) AS viewed_required,
		  COUNT(*) FILTER (WHERE m.is_active AND m.deleted_at IS NULL) AS total_all,
		  COUNT(*) FILTER (WHERE m.is_active AND m.deleted_at IS NULL AND mp.id IS NOT NULL) AS viewed_all,
		  COUNT(*) FILTER (WHERE m.is_active AND m.deleted_at IS NULL) AS total_active_all,
		  COUNT(*) FILTER (WHERE m.is_active AND m.deleted_at IS NULL AND mp.id IS NOT NULL) AS viewed_active_all
		FROM roadmap_materials m
		LEFT JOIN material_progress mp ON mp.material_id = m.id AND mp.student_id = $1
		WHERE m.block_id = $2
	`, studentID, blockID)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// UpsertBlockProgress — пишет статус блока.
func (r *Repository) UpsertBlockProgress(ctx context.Context, studentID, blockID uuid.UUID, status models.BlockStatus, approvedBy *uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO block_progress (student_id, block_id, status, approved_by, approved_at)
		VALUES ($1, $2, $3, $4, CASE WHEN $3 = 'approved' THEN NOW() ELSE NULL END)
		ON CONFLICT (student_id, block_id) DO UPDATE SET
		  status = EXCLUDED.status,
		  approved_by = CASE WHEN EXCLUDED.status = 'approved' THEN EXCLUDED.approved_by ELSE NULL END,
		  approved_at = CASE WHEN EXCLUDED.status = 'approved' THEN NOW() ELSE NULL END,
		  updated_at = NOW()
	`, studentID, blockID, string(status), approvedBy)
	return err
}

func (r *Repository) GetBlockProgress(ctx context.Context, studentID, blockID uuid.UUID) (*models.BlockProgress, error) {
	var bp models.BlockProgress
	err := r.db.GetContext(ctx, &bp, `
		SELECT id, student_id, block_id, status, approved_by, approved_at, created_at, updated_at
		FROM block_progress WHERE student_id = $1 AND block_id = $2
	`, studentID, blockID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &bp, nil
}

func (r *Repository) ListBlockProgress(ctx context.Context, studentID uuid.UUID) ([]models.BlockProgress, error) {
	var out []models.BlockProgress
	err := r.db.SelectContext(ctx, &out, `
		SELECT id, student_id, block_id, status, approved_by, approved_at, created_at, updated_at
		FROM block_progress WHERE student_id = $1
	`, studentID)
	return out, err
}

// MarkAllMaterialsOfBlockViewed — при подтверждении блока ставит viewed для всех его активных материалов.
func (r *Repository) MarkAllMaterialsOfBlockViewed(ctx context.Context, studentID, blockID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO material_progress (student_id, material_id)
		SELECT $1, m.id FROM roadmap_materials m
		WHERE m.block_id = $2 AND m.is_active = TRUE AND m.deleted_at IS NULL
		ON CONFLICT (student_id, material_id) DO NOTHING
	`, studentID, blockID)
	return err
}

func (r *Repository) GetMaterialBlockID(ctx context.Context, materialID uuid.UUID) (uuid.UUID, error) {
	var blockID uuid.UUID
	err := r.db.GetContext(ctx, &blockID, `SELECT block_id FROM roadmap_materials WHERE id = $1`, materialID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return uuid.Nil, ErrNotFound
		}
		return uuid.Nil, fmt.Errorf("get material block: %w", err)
	}
	return blockID, nil
}

// CountApprovedBlocks — сколько блоков уже approved у студента.
func (r *Repository) CountApprovedBlocks(ctx context.Context, studentID uuid.UUID) (int, error) {
	var n int
	err := r.db.GetContext(ctx, &n, `
		SELECT COUNT(*) FROM block_progress WHERE student_id = $1 AND status = 'approved'
	`, studentID)
	return n, err
}

// CountTotalActiveBlocks — сколько в целом активных блоков в системе.
func (r *Repository) CountTotalActiveBlocks(ctx context.Context) (int, error) {
	var n int
	err := r.db.GetContext(ctx, &n, `
		SELECT COUNT(*) FROM roadmap_blocks WHERE is_active = TRUE AND deleted_at IS NULL
	`)
	return n, err
}

func (r *Repository) CountViewedMaterials(ctx context.Context, studentID uuid.UUID) (int, error) {
	var n int
	err := r.db.GetContext(ctx, &n, `
		SELECT COUNT(*) FROM material_progress mp
		JOIN roadmap_materials m ON m.id = mp.material_id
		WHERE mp.student_id = $1 AND m.is_active = TRUE AND m.deleted_at IS NULL
	`, studentID)
	return n, err
}
