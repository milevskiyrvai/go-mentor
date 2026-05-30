package bonus

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

// AchievementTrigger — пересчёт ачивок после события (например, approve 1×1 → «1×1 игрок»).
type AchievementTrigger interface {
	EvaluateAll(ctx context.Context, userID uuid.UUID) error
}

// Notifier — публикует in-app уведомления (§19).
type Notifier interface {
	Notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, metadata any)
}

type Service struct {
	repo     *Repository
	trigger  AchievementTrigger
	notifier Notifier
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// SetTrigger подключает achievement engine после конструкции (разрывает цикл зависимостей).
func (s *Service) SetTrigger(t AchievementTrigger) {
	s.trigger = t
}

// SetNotifier подключает in-app notifier.
func (s *Service) SetNotifier(n Notifier) {
	s.notifier = n
}

func (s *Service) fire(ctx context.Context, userID uuid.UUID) {
	if s.trigger != nil {
		_ = s.trigger.EvaluateAll(ctx, userID)
	}
}

func (s *Service) notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, meta any) {
	if s.notifier != nil {
		s.notifier.Notify(ctx, userID, evType, title, body, meta)
	}
}

func (s *Service) Balance(ctx context.Context, userID uuid.UUID) (int, error) {
	return s.repo.Balance(ctx, userID)
}

func (s *Service) DiscountPercent(ctx context.Context, userID uuid.UUID) (float64, error) {
	return s.repo.DiscountPercent(ctx, userID)
}

func (s *Service) ListTransactions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.BonusTransaction, error) {
	return s.repo.ListTransactions(ctx, userID, limit, offset)
}

func (s *Service) ConvertToDiscount(ctx context.Context, userID uuid.UUID, bonusAmount int) (float64, error) {
	pct, err := s.repo.ConvertToDiscount(ctx, userID, bonusAmount)
	if err != nil {
		return 0, err
	}
	body := fmt.Sprintf("Списано %d бонусов. Итоговая скидка: %.2f%%.", bonusAmount, pct)
	s.notify(ctx, userID, "bonus_debited", "Конвертация бонусов в скидку", &body, map[string]any{
		"amount":           bonusAmount,
		"discount_percent": pct,
	})
	return pct, nil
}

// AwardAchievement — добавляет achievement_reward транзакцию (используется engine'ом ачивок).
func (s *Service) AwardAchievement(ctx context.Context, userID uuid.UUID, amount int, achievementID uuid.UUID, title string) error {
	if amount == 0 {
		return nil
	}
	src := "achievement"
	srcID := achievementID.String()
	reason := title
	return s.repo.AddTransaction(ctx, models.BonusTransaction{
		UserID:     userID,
		Type:       models.BonusOpAchievement,
		Amount:     amount,
		Reason:     &reason,
		SourceType: &src,
		SourceID:   &srcID,
	})
}

// ManualAdjust — Admin вручную меняет баланс.
func (s *Service) ManualAdjust(ctx context.Context, userID uuid.UUID, amount int, reason string) error {
	src := "manual"
	return s.repo.AddTransaction(ctx, models.BonusTransaction{
		UserID:     userID,
		Type:       models.BonusOpManualAdjust,
		Amount:     amount,
		Reason:     &reason,
		SourceType: &src,
	})
}

// 1x1 — при создании проверяем баланс ≥ 1000 (§12.1, §24.22).

func (s *Service) CreateOneOnOne(ctx context.Context, studentID uuid.UUID) (*models.OneOnOneRequest, error) {
	balance, err := s.repo.Balance(ctx, studentID)
	if err != nil {
		return nil, err
	}
	if balance < 1000 {
		return nil, ErrInsufficientFunds
	}
	return s.repo.CreateOneOnOne(ctx, studentID)
}

func (s *Service) GetOneOnOne(ctx context.Context, id uuid.UUID) (*models.OneOnOneRequest, error) {
	return s.repo.GetOneOnOne(ctx, id)
}

func (s *Service) ListOneOnOneByStudent(ctx context.Context, studentID uuid.UUID) ([]models.OneOnOneRequest, error) {
	return s.repo.ListOneOnOneByStudent(ctx, studentID)
}

func (s *Service) ListAllOneOnOne(ctx context.Context, status string) ([]models.OneOnOneRequest, error) {
	return s.repo.ListAllOneOnOne(ctx, status)
}

func (s *Service) ApproveOneOnOne(ctx context.Context, id, adminID uuid.UUID) (*models.OneOnOneRequest, error) {
	req, err := s.repo.ApproveOneOnOne(ctx, id, adminID)
	if err != nil {
		return nil, err
	}
	// §14.14: ачивка «1×1 игрок» выдаётся при первой одобренной заявке.
	s.fire(ctx, req.StudentID)
	// §19: уведомить ученика что заявка одобрена и бонусы списаны.
	body := "Списано 1000 бонусов. Mentor свяжется с тобой."
	s.notify(ctx, req.StudentID, "one_on_one_approved", "Заявка на 1×1 одобрена", &body, map[string]any{
		"request_id": req.ID,
	})
	return req, nil
}

func (s *Service) RejectOneOnOne(ctx context.Context, id, adminID uuid.UUID) (*models.OneOnOneRequest, error) {
	req, err := s.repo.UpdateOneOnOneStatus(ctx, id, adminID, models.OneOnOneRejected)
	if err != nil {
		return nil, err
	}
	body := "Admin отклонил заявку. Бонусы не списаны."
	s.notify(ctx, req.StudentID, "one_on_one_rejected", "Заявка на 1×1 отклонена", &body, map[string]any{
		"request_id": req.ID,
	})
	return req, nil
}

func (s *Service) CompleteOneOnOne(ctx context.Context, id, adminID uuid.UUID) (*models.OneOnOneRequest, error) {
	req, err := s.repo.UpdateOneOnOneStatus(ctx, id, adminID, models.OneOnOneCompleted)
	if err != nil {
		return nil, err
	}
	body := "Заявка завершена. Спасибо за встречу!"
	s.notify(ctx, req.StudentID, "one_on_one_completed", "Заявка на 1×1 завершена", &body, map[string]any{
		"request_id": req.ID,
	})
	return req, nil
}

func (s *Service) CancelOneOnOne(ctx context.Context, id, adminID uuid.UUID) (*models.OneOnOneRequest, error) {
	return s.repo.UpdateOneOnOneStatus(ctx, id, adminID, models.OneOnOneCancelled)
}

func (s *Service) CountApprovedOneOnOne(ctx context.Context, studentID uuid.UUID) (int, error) {
	return s.repo.CountApprovedOneOnOne(ctx, studentID)
}
