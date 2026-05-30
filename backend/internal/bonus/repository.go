package bonus

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
	"github.com/jmoiron/sqlx"
)

var (
	ErrNotFound          = errors.New("not found")
	ErrInsufficientFunds = errors.New("insufficient bonus balance")
	ErrInvalidStatus     = errors.New("invalid status transition")
	ErrDiscountCapped    = errors.New("discount already at 15% cap")
	ErrInvalidAmount     = errors.New("invalid amount")
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// Balance — баланс = сумма всех транзакций.
func (r *Repository) Balance(ctx context.Context, userID uuid.UUID) (int, error) {
	var n sql.NullInt64
	err := r.db.GetContext(ctx, &n, `SELECT COALESCE(SUM(amount), 0) FROM bonus_transactions WHERE user_id = $1`, userID)
	if err != nil {
		return 0, err
	}
	return int(n.Int64), nil
}

// DiscountPercent — суммарный % скидки.
func (r *Repository) DiscountPercent(ctx context.Context, userID uuid.UUID) (float64, error) {
	var n sql.NullFloat64
	err := r.db.GetContext(ctx, &n, `SELECT COALESCE(SUM(discount_percent), 0) FROM discount_conversions WHERE user_id = $1`, userID)
	if err != nil {
		return 0, err
	}
	return n.Float64, nil
}

// AddTransaction — пишет транзакцию.
func (r *Repository) AddTransaction(ctx context.Context, t models.BonusTransaction) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO bonus_transactions (user_id, type, amount, reason, source_type, source_id)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, t.UserID, string(t.Type), t.Amount, t.Reason, t.SourceType, t.SourceID)
	return err
}

// AddTransactionTx — версия в транзакции.
func (r *Repository) AddTransactionTx(ctx context.Context, tx *sqlx.Tx, t models.BonusTransaction) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO bonus_transactions (user_id, type, amount, reason, source_type, source_id)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, t.UserID, string(t.Type), t.Amount, t.Reason, t.SourceType, t.SourceID)
	return err
}

func (r *Repository) ListTransactions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.BonusTransaction, error) {
	if limit == 0 {
		limit = 50
	}
	var out []models.BonusTransaction
	err := r.db.SelectContext(ctx, &out, `
		SELECT id, user_id, type, amount, reason, source_type, source_id, created_at
		FROM bonus_transactions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	return out, err
}

// ConvertToDiscount — атомарно: проверяет баланс, % cap, пишет транзакцию + discount_conversion.
func (r *Repository) ConvertToDiscount(ctx context.Context, userID uuid.UUID, bonusAmount int) (float64, error) {
	if bonusAmount <= 0 || bonusAmount%100 != 0 {
		return 0, ErrInvalidAmount
	}
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var balance int
	if err := tx.GetContext(ctx, &balance, `SELECT COALESCE(SUM(amount), 0) FROM bonus_transactions WHERE user_id = $1`, userID); err != nil {
		return 0, err
	}
	if balance < bonusAmount {
		return 0, ErrInsufficientFunds
	}

	var currentPct float64
	if err := tx.GetContext(ctx, &currentPct, `SELECT COALESCE(SUM(discount_percent), 0) FROM discount_conversions WHERE user_id = $1`, userID); err != nil {
		return 0, err
	}
	const cap = 15.0
	if currentPct >= cap {
		return 0, ErrDiscountCapped
	}

	addPct := float64(bonusAmount) / 100.0
	if currentPct+addPct > cap {
		// Не разрешаем «перебор»: конверсия ровно на остаток.
		return 0, fmt.Errorf("%w: requested %.2f%% but only %.2f%% left", ErrDiscountCapped, addPct, cap-currentPct)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO bonus_transactions (user_id, type, amount, reason, source_type)
		VALUES ($1, 'discount_conversion', $2, $3, 'discount_conversion')
	`, userID, -bonusAmount, fmt.Sprintf("Конвертация в скидку %.2f%%", addPct)); err != nil {
		return 0, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO discount_conversions (user_id, bonus_amount, discount_percent)
		VALUES ($1, $2, $3)
	`, userID, bonusAmount, addPct); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return currentPct + addPct, nil
}

// ====== 1x1 ======

func (r *Repository) CreateOneOnOne(ctx context.Context, studentID uuid.UUID) (*models.OneOnOneRequest, error) {
	var req models.OneOnOneRequest
	err := r.db.GetContext(ctx, &req, `
		INSERT INTO one_on_one_requests (student_id, status)
		VALUES ($1, 'pending')
		RETURNING id, student_id, status, processed_by, processed_at, created_at, updated_at
	`, studentID)
	return &req, err
}

func (r *Repository) GetOneOnOne(ctx context.Context, id uuid.UUID) (*models.OneOnOneRequest, error) {
	var req models.OneOnOneRequest
	err := r.db.GetContext(ctx, &req, `
		SELECT id, student_id, status, processed_by, processed_at, created_at, updated_at
		FROM one_on_one_requests WHERE id = $1
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &req, nil
}

func (r *Repository) ListOneOnOneByStudent(ctx context.Context, studentID uuid.UUID) ([]models.OneOnOneRequest, error) {
	var out []models.OneOnOneRequest
	err := r.db.SelectContext(ctx, &out, `
		SELECT id, student_id, status, processed_by, processed_at, created_at, updated_at
		FROM one_on_one_requests WHERE student_id = $1 ORDER BY created_at DESC
	`, studentID)
	return out, err
}

func (r *Repository) ListAllOneOnOne(ctx context.Context, status string) ([]models.OneOnOneRequest, error) {
	q := `SELECT id, student_id, status, processed_by, processed_at, created_at, updated_at
	      FROM one_on_one_requests`
	args := []any{}
	if status != "" {
		q += " WHERE status = $1"
		args = append(args, status)
	}
	q += " ORDER BY created_at DESC"
	var out []models.OneOnOneRequest
	err := r.db.SelectContext(ctx, &out, q, args...)
	return out, err
}

// ApproveOneOnOne — атомарно: проверяет баланс ≥ 1000, списывает, переводит в approved.
func (r *Repository) ApproveOneOnOne(ctx context.Context, id, adminID uuid.UUID) (*models.OneOnOneRequest, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var req models.OneOnOneRequest
	err = tx.GetContext(ctx, &req, `
		SELECT id, student_id, status, processed_by, processed_at, created_at, updated_at
		FROM one_on_one_requests WHERE id = $1 FOR UPDATE
	`, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if req.Status != models.OneOnOnePending {
		return nil, ErrInvalidStatus
	}

	var balance int
	if err := tx.GetContext(ctx, &balance, `SELECT COALESCE(SUM(amount), 0) FROM bonus_transactions WHERE user_id = $1`, req.StudentID); err != nil {
		return nil, err
	}
	if balance < 1000 {
		return nil, ErrInsufficientFunds
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO bonus_transactions (user_id, type, amount, reason, source_type, source_id)
		VALUES ($1, 'one_on_one_spend', -1000, '1x1 заявка одобрена', 'one_on_one', $2)
	`, req.StudentID, id.String()); err != nil {
		return nil, err
	}

	err = tx.GetContext(ctx, &req, `
		UPDATE one_on_one_requests
		SET status = 'approved', processed_by = $2, processed_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING id, student_id, status, processed_by, processed_at, created_at, updated_at
	`, id, adminID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *Repository) UpdateOneOnOneStatus(ctx context.Context, id, adminID uuid.UUID, status models.OneOnOneStatus) (*models.OneOnOneRequest, error) {
	var req models.OneOnOneRequest
	err := r.db.GetContext(ctx, &req, `
		UPDATE one_on_one_requests
		SET status = $2, processed_by = $3, processed_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING id, student_id, status, processed_by, processed_at, created_at, updated_at
	`, id, string(status), adminID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &req, nil
}

// CountApprovedOneOnOne — для achievement engine (1x1 игрок выдаётся после первой approve).
func (r *Repository) CountApprovedOneOnOne(ctx context.Context, studentID uuid.UUID) (int, error) {
	var n int
	err := r.db.GetContext(ctx, &n, `SELECT COUNT(*) FROM one_on_one_requests WHERE student_id = $1 AND status IN ('approved','completed')`, studentID)
	return n, err
}
