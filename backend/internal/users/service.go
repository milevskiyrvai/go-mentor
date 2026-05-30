package users

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/auth"
	"github.com/itrostik/gomentor/internal/models"
)

var ErrInvalidRole = errors.New("invalid role")

// AchievementTrigger — пересчёт ачивок после редактирования профиля.
type AchievementTrigger interface {
	EvaluateAll(ctx context.Context, userID uuid.UUID) error
}

type Service struct {
	repo    *Repository
	trigger AchievementTrigger
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) SetTrigger(t AchievementTrigger) {
	s.trigger = t
}

type CreateInput struct {
	Login             string
	Password          string
	DisplayName       string
	TelegramUsername  *string
	LearningStartedAt *time.Time
	Roles             []string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (*models.User, error) {
	if in.Login == "" || in.Password == "" || in.DisplayName == "" {
		return nil, errors.New("login, password and display_name are required")
	}
	roles, err := parseRoles(in.Roles)
	if err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return nil, errors.New("at least one role required")
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return nil, err
	}

	if in.LearningStartedAt == nil {
		for _, r := range roles {
			if r == models.RoleStudent {
				now := time.Now()
				in.LearningStartedAt = &now
				break
			}
		}
	}

	return s.repo.Create(ctx, CreateUserParams{
		Login:             in.Login,
		PasswordHash:      hash,
		DisplayName:       in.DisplayName,
		TelegramUsername:  in.TelegramUsername,
		LearningStartedAt: in.LearningStartedAt,
		Roles:             roles,
	})
}

func (s *Service) UpdateSelf(ctx context.Context, id uuid.UUID, p UpdateProfileParams) (*models.User, error) {
	u, err := s.repo.UpdateProfile(ctx, id, p)
	if err != nil {
		return nil, err
	}
	// §14.12: ачивка «Профиль оформлен» при заполненных avatar + about + display_name.
	if s.trigger != nil {
		_ = s.trigger.EvaluateAll(ctx, id)
	}
	return u, nil
}

type AdminUpdateInput struct {
	DisplayName       *string
	TelegramUsername  *string
	LearningStartedAt *time.Time
	Roles             *[]string
}

func (s *Service) AdminUpdate(ctx context.Context, id uuid.UUID, in AdminUpdateInput) (*models.User, error) {
	p := AdminUpdateParams{
		DisplayName:       in.DisplayName,
		TelegramUsername:  in.TelegramUsername,
		LearningStartedAt: in.LearningStartedAt,
	}
	if in.Roles != nil {
		roles, err := parseRoles(*in.Roles)
		if err != nil {
			return nil, err
		}
		p.Roles = &roles
	}
	return s.repo.AdminUpdate(ctx, id, p)
}

func (s *Service) ResetPassword(ctx context.Context, id uuid.UUID, newPassword string) error {
	if newPassword == "" {
		return errors.New("password required")
	}
	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}
	return s.repo.SetPassword(ctx, id, hash)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.SoftDelete(ctx, id)
}

// Restore — §4.4: Admin может восстановить soft-deleted пользователя.
func (s *Service) Restore(ctx context.Context, id uuid.UUID) error {
	return s.repo.Restore(ctx, id)
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetRolesForUser(ctx context.Context, id uuid.UUID) ([]models.Role, error) {
	return s.repo.GetRolesForUser(ctx, id)
}

func (s *Service) GetBuddyOfStudent(ctx context.Context, studentID uuid.UUID) (*uuid.UUID, error) {
	return s.repo.GetBuddyOfStudent(ctx, studentID)
}

func (s *Service) List(ctx context.Context, f ListFilter) ([]ListItem, error) {
	return s.repo.List(ctx, f)
}

func (s *Service) AssignBuddy(ctx context.Context, studentID, buddyID uuid.UUID) error {
	return s.repo.AssignBuddy(ctx, studentID, buddyID)
}

func (s *Service) UnassignBuddy(ctx context.Context, studentID uuid.UUID) error {
	return s.repo.UnassignBuddy(ctx, studentID)
}

func (s *Service) ListStudentSummariesOfBuddy(ctx context.Context, buddyID uuid.UUID) ([]StudentSummary, error) {
	return s.repo.ListStudentSummariesOfBuddy(ctx, buddyID)
}

func parseRoles(in []string) ([]models.Role, error) {
	out := make([]models.Role, 0, len(in))
	seen := map[string]bool{}
	for _, s := range in {
		if seen[s] {
			continue
		}
		seen[s] = true
		r := models.Role(s)
		if !r.Valid() {
			return nil, ErrInvalidRole
		}
		out = append(out, r)
	}
	return out, nil
}
