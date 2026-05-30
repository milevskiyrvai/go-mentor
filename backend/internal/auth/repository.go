package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/jmoiron/sqlx"
)

var ErrUserNotFound = errors.New("user not found")

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetUserByLogin(ctx context.Context, login string) (*models.User, error) {
	var u models.User
	err := r.db.GetContext(ctx, &u, `
		SELECT id, login, password_hash, display_name, avatar_url, about,
		       telegram_username, learning_started_at, is_profile_private,
		       is_deleted, created_at, updated_at
		FROM users
		WHERE login = $1 AND is_deleted = FALSE
	`, login)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user by login: %w", err)
	}
	return &u, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var u models.User
	err := r.db.GetContext(ctx, &u, `
		SELECT id, login, password_hash, display_name, avatar_url, about,
		       telegram_username, learning_started_at, is_profile_private,
		       is_deleted, created_at, updated_at
		FROM users
		WHERE id = $1 AND is_deleted = FALSE
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

func (r *Repository) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]models.Role, error) {
	var roles []string
	err := r.db.SelectContext(ctx, &roles, `
		SELECT role FROM user_roles WHERE user_id = $1 ORDER BY role
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get user roles: %w", err)
	}
	out := make([]models.Role, 0, len(roles))
	for _, r := range roles {
		out = append(out, models.Role(r))
	}
	return out, nil
}
