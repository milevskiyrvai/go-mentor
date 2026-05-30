package users

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/jmoiron/sqlx"
)

var (
	ErrNotFound      = errors.New("user not found")
	ErrLoginTaken    = errors.New("login already taken")
	ErrTelegramTaken = errors.New("telegram username already taken")
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

type CreateUserParams struct {
	Login             string
	PasswordHash      string
	DisplayName       string
	TelegramUsername  *string
	LearningStartedAt *time.Time
	Roles             []models.Role
}

func (r *Repository) Create(ctx context.Context, p CreateUserParams) (*models.User, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var u models.User
	err = tx.GetContext(ctx, &u, `
		INSERT INTO users (login, password_hash, display_name, telegram_username, learning_started_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, login, password_hash, display_name, avatar_url, about,
		          telegram_username, learning_started_at, is_profile_private,
		          is_deleted, created_at, updated_at
	`, p.Login, p.PasswordHash, p.DisplayName, p.TelegramUsername, p.LearningStartedAt)
	if err != nil {
		return nil, mapPgError(err)
	}

	for _, role := range p.Roles {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO user_roles (user_id, role) VALUES ($1, $2)
		`, u.ID, string(role)); err != nil {
			return nil, fmt.Errorf("insert role: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &u, nil
}

type UpdateProfileParams struct {
	DisplayName      *string
	AvatarURL        *string
	About            *string
	IsProfilePrivate *bool
}

func (r *Repository) UpdateProfile(ctx context.Context, id uuid.UUID, p UpdateProfileParams) (*models.User, error) {
	sets := []string{}
	args := []any{}
	idx := 1
	if p.DisplayName != nil {
		sets = append(sets, fmt.Sprintf("display_name = $%d", idx))
		args = append(args, *p.DisplayName)
		idx++
	}
	if p.AvatarURL != nil {
		sets = append(sets, fmt.Sprintf("avatar_url = $%d", idx))
		args = append(args, *p.AvatarURL)
		idx++
	}
	if p.About != nil {
		sets = append(sets, fmt.Sprintf("about = $%d", idx))
		args = append(args, *p.About)
		idx++
	}
	if p.IsProfilePrivate != nil {
		sets = append(sets, fmt.Sprintf("is_profile_private = $%d", idx))
		args = append(args, *p.IsProfilePrivate)
		idx++
	}
	if len(sets) == 0 {
		return r.GetByID(ctx, id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE users SET %s WHERE id = $%d AND is_deleted = FALSE
		RETURNING id, login, password_hash, display_name, avatar_url, about,
		          telegram_username, learning_started_at, is_profile_private,
		          is_deleted, created_at, updated_at
	`, strings.Join(sets, ", "), idx)

	var u models.User
	if err := r.db.GetContext(ctx, &u, query, args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

type AdminUpdateParams struct {
	DisplayName       *string
	TelegramUsername  *string
	LearningStartedAt *time.Time
	Roles             *[]models.Role
}

func (r *Repository) AdminUpdate(ctx context.Context, id uuid.UUID, p AdminUpdateParams) (*models.User, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	sets := []string{}
	args := []any{}
	idx := 1
	if p.DisplayName != nil {
		sets = append(sets, fmt.Sprintf("display_name = $%d", idx))
		args = append(args, *p.DisplayName)
		idx++
	}
	if p.TelegramUsername != nil {
		sets = append(sets, fmt.Sprintf("telegram_username = $%d", idx))
		args = append(args, *p.TelegramUsername)
		idx++
	}
	if p.LearningStartedAt != nil {
		sets = append(sets, fmt.Sprintf("learning_started_at = $%d", idx))
		args = append(args, *p.LearningStartedAt)
		idx++
	}
	if len(sets) > 0 {
		sets = append(sets, "updated_at = NOW()")
		args = append(args, id)
		query := fmt.Sprintf(`UPDATE users SET %s WHERE id = $%d`, strings.Join(sets, ", "), idx)
		if _, err := tx.ExecContext(ctx, query, args...); err != nil {
			return nil, mapPgError(err)
		}
	}

	if p.Roles != nil {
		if _, err := tx.ExecContext(ctx, `DELETE FROM user_roles WHERE user_id = $1`, id); err != nil {
			return nil, err
		}
		for _, role := range *p.Roles {
			if _, err := tx.ExecContext(ctx, `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`, id, string(role)); err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *Repository) SetPassword(ctx context.Context, id uuid.UUID, hash string) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE users SET password_hash = $1, updated_at = NOW()
		WHERE id = $2 AND is_deleted = FALSE
	`, hash, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE users SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1
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

func (r *Repository) Restore(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE users SET is_deleted = FALSE, updated_at = NOW() WHERE id = $1
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

func (r *Repository) GetRolesForUser(ctx context.Context, id uuid.UUID) ([]models.Role, error) {
	var raw []string
	if err := r.db.SelectContext(ctx, &raw, `SELECT role FROM user_roles WHERE user_id = $1 ORDER BY role`, id); err != nil {
		return nil, err
	}
	out := make([]models.Role, 0, len(raw))
	for _, s := range raw {
		out = append(out, models.Role(s))
	}
	return out, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var u models.User
	err := r.db.GetContext(ctx, &u, `
		SELECT id, login, password_hash, display_name, avatar_url, about,
		       telegram_username, learning_started_at, is_profile_private,
		       is_deleted, created_at, updated_at
		FROM users WHERE id = $1
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

type ListFilter struct {
	Role           string
	IncludeDeleted bool
	Search         string
	Limit          int
	Offset         int
}

type ListItem struct {
	User       models.User
	Roles      []models.Role
	BuddyID    *uuid.UUID
	BuddyName  *string
	StudentCnt int
}

func (r *Repository) List(ctx context.Context, f ListFilter) ([]ListItem, error) {
	if f.Limit == 0 {
		f.Limit = 50
	}
	conds := []string{}
	args := []any{}
	idx := 1
	if !f.IncludeDeleted {
		conds = append(conds, "u.is_deleted = FALSE")
	}
	if f.Search != "" {
		conds = append(conds, fmt.Sprintf("(u.login ILIKE $%d OR u.display_name ILIKE $%d)", idx, idx))
		args = append(args, "%"+f.Search+"%")
		idx++
	}
	if f.Role != "" {
		conds = append(conds, fmt.Sprintf("EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = $%d)", idx))
		args = append(args, f.Role)
		idx++
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	args = append(args, f.Limit, f.Offset)
	limOff := fmt.Sprintf("LIMIT $%d OFFSET $%d", idx, idx+1)

	rows, err := r.db.QueryxContext(ctx, fmt.Sprintf(`
		SELECT u.id, u.login, u.password_hash, u.display_name, u.avatar_url, u.about,
		       u.telegram_username, u.learning_started_at, u.is_profile_private,
		       u.is_deleted, u.created_at, u.updated_at,
		       COALESCE(array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles,
		       sba.buddy_id,
		       b.display_name AS buddy_name,
		       (SELECT COUNT(*) FROM student_buddy_assignments WHERE buddy_id = u.id) AS student_cnt
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN student_buddy_assignments sba ON sba.student_id = u.id
		LEFT JOIN users b ON b.id = sba.buddy_id
		%s
		GROUP BY u.id, sba.buddy_id, b.display_name
		ORDER BY u.created_at DESC
		%s
	`, where, limOff), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []ListItem{}
	for rows.Next() {
		var (
			u          models.User
			rolesArr   pgStringArray
			buddyID    *uuid.UUID
			buddyName  *string
			studentCnt int
		)
		if err := rows.Scan(
			&u.ID, &u.Login, &u.PasswordHash, &u.DisplayName, &u.AvatarURL, &u.About,
			&u.TelegramUsername, &u.LearningStartedAt, &u.IsProfilePrivate,
			&u.IsDeleted, &u.CreatedAt, &u.UpdatedAt,
			&rolesArr, &buddyID, &buddyName, &studentCnt,
		); err != nil {
			return nil, err
		}
		roles := make([]models.Role, 0, len(rolesArr))
		for _, s := range rolesArr {
			roles = append(roles, models.Role(s))
		}
		out = append(out, ListItem{
			User:       u,
			Roles:      roles,
			BuddyID:    buddyID,
			BuddyName:  buddyName,
			StudentCnt: studentCnt,
		})
	}
	return out, rows.Err()
}

func (r *Repository) AssignBuddy(ctx context.Context, studentID, buddyID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO student_buddy_assignments (student_id, buddy_id)
		VALUES ($1, $2)
		ON CONFLICT (student_id) DO UPDATE SET buddy_id = EXCLUDED.buddy_id, created_at = NOW()
	`, studentID, buddyID)
	return err
}

func (r *Repository) UnassignBuddy(ctx context.Context, studentID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM student_buddy_assignments WHERE student_id = $1`, studentID)
	return err
}

func (r *Repository) GetBuddyOfStudent(ctx context.Context, studentID uuid.UUID) (*uuid.UUID, error) {
	var buddyID uuid.UUID
	err := r.db.GetContext(ctx, &buddyID, `SELECT buddy_id FROM student_buddy_assignments WHERE student_id = $1`, studentID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &buddyID, nil
}

func (r *Repository) ListStudentsOfBuddy(ctx context.Context, buddyID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := r.db.SelectContext(ctx, &ids, `
		SELECT student_id FROM student_buddy_assignments WHERE buddy_id = $1
	`, buddyID)
	return ids, err
}

// ListStudentSummariesOfBuddy — расширенный список учеников Buddy со сводным прогрессом.
type StudentSummary struct {
	User             models.User `db:"-"`
	ID               uuid.UUID   `db:"id"`
	Login            string      `db:"login"`
	DisplayName      string      `db:"display_name"`
	AvatarURL        *string     `db:"avatar_url"`
	About            *string     `db:"about"`
	TelegramUsername *string     `db:"telegram_username"`
	LearningStartAt  *time.Time  `db:"learning_started_at"`
	IsPrivate        bool        `db:"is_profile_private"`
	IsDeleted        bool        `db:"is_deleted"`
	CreatedAt        time.Time   `db:"created_at"`
	ApprovedBlocks   int         `db:"approved_blocks"`
	WaitingBlocks    int         `db:"waiting_blocks"`
	TotalBlocks      int         `db:"total_blocks"`
	TotalRequired    int         `db:"total_required"`
	ViewedRequired   int         `db:"viewed_required"`
	LastActivityAt   *time.Time  `db:"last_activity_at"`
}

func (r *Repository) ListStudentSummariesOfBuddy(ctx context.Context, buddyID uuid.UUID) ([]StudentSummary, error) {
	rows, err := r.db.QueryxContext(ctx, `
		WITH my AS (
			SELECT student_id FROM student_buddy_assignments WHERE buddy_id = $1
		),
		total_blocks AS (
			SELECT COUNT(*)::int AS n FROM roadmap_blocks WHERE is_active AND deleted_at IS NULL
		),
		approved_per AS (
			SELECT student_id, COUNT(*)::int AS approved
			FROM block_progress WHERE status = 'approved' GROUP BY student_id
		),
		waiting_per AS (
			SELECT student_id, COUNT(*)::int AS waiting
			FROM block_progress WHERE status = 'waiting_buddy_confirmation' GROUP BY student_id
		),
		req_per AS (
			SELECT mp.student_id,
			       (SELECT COUNT(*) FROM roadmap_materials WHERE is_required AND is_active AND deleted_at IS NULL)::int AS total_required,
			       COUNT(*) FILTER (WHERE m.is_required AND m.is_active AND m.deleted_at IS NULL)::int AS viewed_required
			FROM material_progress mp
			LEFT JOIN roadmap_materials m ON m.id = mp.material_id
			GROUP BY mp.student_id
		),
		last_act AS (
			SELECT user_id, MAX(created_at) AS last_activity_at
			FROM activity_events GROUP BY user_id
		)
		SELECT u.id, u.login, u.display_name, u.avatar_url, u.about,
		       u.telegram_username, u.learning_started_at, u.is_profile_private,
		       u.is_deleted, u.created_at,
		       COALESCE(ap.approved, 0)        AS approved_blocks,
		       COALESCE(wp.waiting, 0)         AS waiting_blocks,
		       (SELECT n FROM total_blocks)    AS total_blocks,
		       COALESCE(rp.total_required, (SELECT COUNT(*) FROM roadmap_materials WHERE is_required AND is_active AND deleted_at IS NULL))::int AS total_required,
		       COALESCE(rp.viewed_required, 0) AS viewed_required,
		       la.last_activity_at
		FROM my
		JOIN users u ON u.id = my.student_id AND u.is_deleted = FALSE
		LEFT JOIN approved_per ap ON ap.student_id = u.id
		LEFT JOIN waiting_per  wp ON wp.student_id = u.id
		LEFT JOIN req_per      rp ON rp.student_id = u.id
		LEFT JOIN last_act     la ON la.user_id = u.id
		ORDER BY u.display_name ASC
	`, buddyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []StudentSummary{}
	for rows.Next() {
		var s StudentSummary
		if err := rows.Scan(
			&s.ID, &s.Login, &s.DisplayName, &s.AvatarURL, &s.About,
			&s.TelegramUsername, &s.LearningStartAt, &s.IsPrivate,
			&s.IsDeleted, &s.CreatedAt,
			&s.ApprovedBlocks, &s.WaitingBlocks, &s.TotalBlocks,
			&s.TotalRequired, &s.ViewedRequired, &s.LastActivityAt,
		); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func mapPgError(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "users_login_key"):
		return ErrLoginTaken
	case strings.Contains(msg, "users_telegram_username_key"):
		return ErrTelegramTaken
	}
	return err
}
