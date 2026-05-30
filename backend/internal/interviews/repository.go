package interviews

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

var ErrNotFound = errors.New("not found")

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

type CreateParams struct {
	Type      models.InterviewType
	StudentID uuid.UUID
	BuddyID   *uuid.UUID
	URL       *string
	Company   *string
	Position  *string
	Grade     *string
	Stack     *string
	Date      *time.Time
	Status    string
	Result    *string
	Feedback  *string
}

func (r *Repository) Create(ctx context.Context, p CreateParams) (*models.Interview, error) {
	var iv models.Interview
	err := r.db.GetContext(ctx, &iv, `
		INSERT INTO interviews (type, student_id, buddy_id, url, company, position, grade, stack, date, status, result, feedback)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, type, student_id, buddy_id, url, company, position, grade, stack, date, status, result, feedback, created_at, updated_at
	`, string(p.Type), p.StudentID, p.BuddyID, p.URL, p.Company, p.Position, p.Grade, p.Stack, p.Date, p.Status, p.Result, p.Feedback)
	return &iv, err
}

type UpdateParams struct {
	URL      *string
	Company  *string
	Position *string
	Grade    *string
	Stack    *string
	Date     *time.Time
	Status   *string
	Result   *string
	Feedback *string
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, p UpdateParams) (*models.Interview, error) {
	sets := []string{}
	args := []any{}
	idx := 1
	add := func(col string, v any) {
		sets = append(sets, fmt.Sprintf("%s = $%d", col, idx))
		args = append(args, v)
		idx++
	}
	if p.URL != nil {
		add("url", *p.URL)
	}
	if p.Company != nil {
		add("company", *p.Company)
	}
	if p.Position != nil {
		add("position", *p.Position)
	}
	if p.Grade != nil {
		add("grade", *p.Grade)
	}
	if p.Stack != nil {
		add("stack", *p.Stack)
	}
	if p.Date != nil {
		add("date", *p.Date)
	}
	if p.Status != nil {
		add("status", *p.Status)
	}
	if p.Result != nil {
		add("result", *p.Result)
	}
	if p.Feedback != nil {
		add("feedback", *p.Feedback)
	}
	if len(sets) == 0 {
		return r.Get(ctx, id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	q := fmt.Sprintf(`
		UPDATE interviews SET %s WHERE id = $%d
		RETURNING id, type, student_id, buddy_id, url, company, position, grade, stack, date, status, result, feedback, created_at, updated_at
	`, strings.Join(sets, ", "), idx)
	var iv models.Interview
	if err := r.db.GetContext(ctx, &iv, q, args...); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &iv, nil
}

func (r *Repository) Get(ctx context.Context, id uuid.UUID) (*models.Interview, error) {
	var iv models.Interview
	err := r.db.GetContext(ctx, &iv, `
		SELECT id, type, student_id, buddy_id, url, company, position, grade, stack, date, status, result, feedback, created_at, updated_at
		FROM interviews WHERE id = $1
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &iv, nil
}

func (r *Repository) ListMineByStudent(ctx context.Context, studentID uuid.UUID, t string) ([]models.Interview, error) {
	q := `SELECT id, type, student_id, buddy_id, url, company, position, grade, stack, date, status, result, feedback, created_at, updated_at
	      FROM interviews WHERE student_id = $1`
	args := []any{studentID}
	if t != "" {
		q += " AND type = $2"
		args = append(args, t)
	}
	q += " ORDER BY date DESC NULLS LAST, created_at DESC"
	var out []models.Interview
	err := r.db.SelectContext(ctx, &out, q, args...)
	return out, err
}

func (r *Repository) ListCatalogReal(ctx context.Context, company, grade, result string) ([]models.Interview, error) {
	conds := []string{"type = 'real'"}
	args := []any{}
	idx := 1
	if company != "" {
		conds = append(conds, fmt.Sprintf("company ILIKE $%d", idx))
		args = append(args, "%"+company+"%")
		idx++
	}
	if grade != "" {
		conds = append(conds, fmt.Sprintf("grade = $%d", idx))
		args = append(args, grade)
		idx++
	}
	if result != "" {
		conds = append(conds, fmt.Sprintf("result = $%d", idx))
		args = append(args, result)
		idx++
	}
	q := `SELECT id, type, student_id, buddy_id, url, company, position, grade, stack, date, status, result, feedback, created_at, updated_at
	      FROM interviews WHERE ` + strings.Join(conds, " AND ") + ` ORDER BY date DESC NULLS LAST, created_at DESC`
	var out []models.Interview
	err := r.db.SelectContext(ctx, &out, q, args...)
	return out, err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM interviews WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
