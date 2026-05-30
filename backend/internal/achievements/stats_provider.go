package achievements

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// DBStatsProvider собирает статистику из БД напрямую — это упрощает граф зависимостей.
type DBStatsProvider struct {
	db *sqlx.DB
}

func NewDBStatsProvider(db *sqlx.DB) *DBStatsProvider {
	return &DBStatsProvider{db: db}
}

func (p *DBStatsProvider) CollectStats(ctx context.Context, studentID uuid.UUID) (*Stats, error) {
	s := &Stats{ApprovedBlocksByIdx: map[int]bool{}}

	// Просмотренные материалы (только активные).
	if err := p.db.GetContext(ctx, &s.ViewedMaterials, `
		SELECT COUNT(*) FROM material_progress mp
		JOIN roadmap_materials m ON m.id = mp.material_id
		WHERE mp.student_id = $1 AND m.is_active = TRUE AND m.deleted_at IS NULL
	`, studentID); err != nil {
		return nil, err
	}

	// approved блоки → индексы по sort_order среди активных.
	type approvedRow struct {
		BlockIndex int `db:"block_index"`
	}
	rows, err := p.db.QueryxContext(ctx, `
		WITH ranked AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC) AS idx
			FROM roadmap_blocks WHERE is_active = TRUE AND deleted_at IS NULL
		)
		SELECT ranked.idx AS block_index
		FROM block_progress bp
		JOIN ranked ON ranked.id = bp.block_id
		WHERE bp.student_id = $1 AND bp.status = 'approved'
	`, studentID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var r approvedRow
		if err := rows.StructScan(&r); err != nil {
			rows.Close()
			return nil, err
		}
		s.ApprovedBlocksByIdx[r.BlockIndex] = true
	}
	rows.Close()

	// Mock-собеседования: completed.
	if err := p.db.GetContext(ctx, &s.MockInterviews, `
		SELECT COUNT(*) FROM interviews WHERE student_id = $1 AND type = 'mock' AND status = 'completed'
	`, studentID); err != nil {
		return nil, err
	}
	// Real-собеседования: любые добавленные.
	if err := p.db.GetContext(ctx, &s.RealInterviews, `
		SELECT COUNT(*) FROM interviews WHERE student_id = $1 AND type = 'real'
	`, studentID); err != nil {
		return nil, err
	}

	// Профиль оформлен: avatar + about + display_name (display_name всегда задан, проверяем avatar+about).
	var profileFilled bool
	if err := p.db.GetContext(ctx, &profileFilled, `
		SELECT (avatar_url IS NOT NULL AND avatar_url <> ''
		        AND about IS NOT NULL AND about <> ''
		        AND display_name IS NOT NULL AND display_name <> '')
		FROM users WHERE id = $1
	`, studentID); err != nil {
		return nil, err
	}
	s.ProfileCompleted = profileFilled

	// Финалки.
	if err := p.db.GetContext(ctx, &s.FinalTechnicalDone, `
		SELECT EXISTS(SELECT 1 FROM final_checks WHERE student_id = $1 AND type = 'final_technical' AND status = 'completed')
	`, studentID); err != nil {
		return nil, err
	}
	if err := p.db.GetContext(ctx, &s.FinalRoastDone, `
		SELECT EXISTS(SELECT 1 FROM final_checks WHERE student_id = $1 AND type = 'final_roast' AND status = 'completed')
	`, studentID); err != nil {
		return nil, err
	}

	// 1×1 approved
	if err := p.db.GetContext(ctx, &s.OneOnOneApprovedDone, `
		SELECT EXISTS(SELECT 1 FROM one_on_one_requests WHERE student_id = $1 AND status IN ('approved','completed'))
	`, studentID); err != nil {
		return nil, err
	}

	return s, nil
}
