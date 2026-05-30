package achievements

import (
	"context"
	"database/sql"
	"encoding/json"
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

func (r *Repository) List(ctx context.Context, includeInactive bool) ([]models.Achievement, error) {
	cond := ""
	if !includeInactive {
		cond = "WHERE is_active = TRUE"
	}
	q := fmt.Sprintf(`
		SELECT id, title, description, reward_bonus, image_url, condition_type, condition_params,
		       is_active, sort_order, created_at, updated_at
		FROM achievements %s
		ORDER BY sort_order ASC, created_at ASC
	`, cond)
	var out []models.Achievement
	err := r.db.SelectContext(ctx, &out, q)
	return out, err
}

func (r *Repository) Get(ctx context.Context, id uuid.UUID) (*models.Achievement, error) {
	var a models.Achievement
	err := r.db.GetContext(ctx, &a, `
		SELECT id, title, description, reward_bonus, image_url, condition_type, condition_params,
		       is_active, sort_order, created_at, updated_at
		FROM achievements WHERE id = $1
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

type CreateParams struct {
	Title           string
	Description     *string
	RewardBonus     int
	ImageURL        *string
	ConditionType   string
	ConditionParams json.RawMessage
}

func (r *Repository) Create(ctx context.Context, p CreateParams) (*models.Achievement, error) {
	params := p.ConditionParams
	if len(params) == 0 {
		params = json.RawMessage(`{}`)
	}
	var a models.Achievement
	err := r.db.GetContext(ctx, &a, `
		INSERT INTO achievements (title, description, reward_bonus, image_url, condition_type, condition_params, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, COALESCE((SELECT MAX(sort_order)+1 FROM achievements), 0))
		RETURNING id, title, description, reward_bonus, image_url, condition_type, condition_params,
		          is_active, sort_order, created_at, updated_at
	`, p.Title, p.Description, p.RewardBonus, p.ImageURL, p.ConditionType, params)
	return &a, err
}

type UpdateParams struct {
	Title           *string
	Description     *string
	RewardBonus     *int
	ImageURL        *string
	ConditionType   *string
	ConditionParams *json.RawMessage
	IsActive        *bool
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, p UpdateParams) (*models.Achievement, error) {
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
	if p.RewardBonus != nil {
		add("reward_bonus", *p.RewardBonus)
	}
	if p.ImageURL != nil {
		add("image_url", *p.ImageURL)
	}
	if p.ConditionType != nil {
		add("condition_type", *p.ConditionType)
	}
	if p.ConditionParams != nil {
		add("condition_params", *p.ConditionParams)
	}
	if p.IsActive != nil {
		add("is_active", *p.IsActive)
	}
	if len(sets) == 0 {
		return r.Get(ctx, id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	q := fmt.Sprintf(`
		UPDATE achievements SET %s WHERE id = $%d
		RETURNING id, title, description, reward_bonus, image_url, condition_type, condition_params,
		          is_active, sort_order, created_at, updated_at
	`, strings.Join(sets, ", "), idx)
	var a models.Achievement
	if err := r.db.GetContext(ctx, &a, q, args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

// GrantIfMissing — выдаёт ачивку пользователю. Возвращает true если выдана сейчас (новая).
func (r *Repository) GrantIfMissing(ctx context.Context, userID, achievementID uuid.UUID) (bool, error) {
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO user_achievements (user_id, achievement_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, achievement_id) DO NOTHING
	`, userID, achievementID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (r *Repository) ListUserAchievements(ctx context.Context, userID uuid.UUID) ([]models.UserAchievement, error) {
	var out []models.UserAchievement
	err := r.db.SelectContext(ctx, &out, `
		SELECT id, user_id, achievement_id, received_at FROM user_achievements WHERE user_id = $1
	`, userID)
	return out, err
}

func (r *Repository) ListUsersWithAchievement(ctx context.Context, achievementID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := r.db.SelectContext(ctx, &ids, `SELECT user_id FROM user_achievements WHERE achievement_id = $1`, achievementID)
	return ids, err
}
