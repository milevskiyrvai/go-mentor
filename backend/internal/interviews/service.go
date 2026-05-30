package interviews

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

var ErrInvalidInput = errors.New("invalid input")

type BuddyResolver interface {
	GetBuddyOfStudent(ctx context.Context, studentID uuid.UUID) (*uuid.UUID, error)
}

// AchievementTrigger — после добавления/завершения собеседования триггерим ачивки.
type AchievementTrigger interface {
	EvaluateAll(ctx context.Context, userID uuid.UUID) error
}

// Notifier — публикует in-app уведомления (§19).
type Notifier interface {
	Notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, metadata any)
}

type Service struct {
	repo     *Repository
	buddy    BuddyResolver
	trigger  AchievementTrigger
	notifier Notifier
}

func NewService(repo *Repository, buddy BuddyResolver, trigger AchievementTrigger) *Service {
	return &Service{repo: repo, buddy: buddy, trigger: trigger}
}

func (s *Service) SetNotifier(n Notifier) { s.notifier = n }

func (s *Service) notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, meta any) {
	if s.notifier != nil {
		s.notifier.Notify(ctx, userID, evType, title, body, meta)
	}
}

// AddReal — Student добавляет real-собеседование (URL обязателен).
type AddRealInput struct {
	StudentID uuid.UUID
	URL       string
	Company   *string
	Position  *string
	Grade     *string
	Stack     *string
	Date      *time.Time
	Result    *string
}

func (s *Service) AddReal(ctx context.Context, in AddRealInput) (*models.Interview, error) {
	if strings.TrimSpace(in.URL) == "" {
		return nil, ErrInvalidInput
	}
	buddyID, _ := s.buddy.GetBuddyOfStudent(ctx, in.StudentID)
	url := in.URL
	iv, err := s.repo.Create(ctx, CreateParams{
		Type:      models.InterviewReal,
		StudentID: in.StudentID,
		BuddyID:   buddyID,
		URL:       &url,
		Company:   in.Company,
		Position:  in.Position,
		Grade:     in.Grade,
		Stack:     in.Stack,
		Date:      in.Date,
		Status:    string(models.InterviewSubmitted),
		Result:    in.Result,
	})
	if err != nil {
		return nil, err
	}
	if s.trigger != nil {
		_ = s.trigger.EvaluateAll(ctx, in.StudentID)
	}
	return iv, nil
}

// CreateMock — Buddy создаёт mock-собеседование.
type CreateMockInput struct {
	StudentID uuid.UUID
	BuddyID   uuid.UUID
	Company   *string
	Position  *string
	Grade     *string
	Stack     *string
	Date      *time.Time
}

func (s *Service) CreateMock(ctx context.Context, in CreateMockInput) (*models.Interview, error) {
	iv, err := s.repo.Create(ctx, CreateParams{
		Type:      models.InterviewMock,
		StudentID: in.StudentID,
		BuddyID:   &in.BuddyID,
		Company:   in.Company,
		Position:  in.Position,
		Grade:     in.Grade,
		Stack:     in.Stack,
		Date:      in.Date,
		Status:    string(models.InterviewScheduled),
	})
	if err != nil {
		return nil, err
	}
	body := "Buddy назначил mock-собеседование. Загляни в раздел «Собеседования»."
	s.notify(ctx, in.StudentID, "mock_scheduled", "Назначено mock-собеседование", &body, map[string]any{
		"interview_id": iv.ID,
	})
	return iv, nil
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, p UpdateParams) (*models.Interview, error) {
	iv, err := s.repo.Update(ctx, id, p)
	if err != nil {
		return nil, err
	}
	if s.trigger != nil {
		_ = s.trigger.EvaluateAll(ctx, iv.StudentID)
	}
	return iv, nil
}

func (s *Service) CompleteMock(ctx context.Context, id uuid.UUID, feedback string) (*models.Interview, error) {
	st := string(models.InterviewCompleted)
	fb := feedback
	iv, err := s.repo.Update(ctx, id, UpdateParams{Status: &st, Feedback: &fb})
	if err != nil {
		return nil, err
	}
	if s.trigger != nil {
		_ = s.trigger.EvaluateAll(ctx, iv.StudentID)
	}
	body := "Buddy завершил mock-собеседование и оставил фидбэк."
	s.notify(ctx, iv.StudentID, "mock_completed", "Mock-собеседование завершено", &body, map[string]any{
		"interview_id": iv.ID,
	})
	return iv, nil
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (*models.Interview, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) ListMine(ctx context.Context, studentID uuid.UUID, t string) ([]models.Interview, error) {
	return s.repo.ListMineByStudent(ctx, studentID, t)
}

func (s *Service) ListCatalog(ctx context.Context, company, grade, result string) ([]models.Interview, error) {
	return s.repo.ListCatalogReal(ctx, company, grade, result)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
