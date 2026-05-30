package achievements

import (
	"context"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

type Service struct {
	repo   *Repository
	engine *Engine
}

func NewService(repo *Repository, engine *Engine) *Service {
	return &Service{repo: repo, engine: engine}
}

func (s *Service) List(ctx context.Context, includeInactive bool) ([]models.Achievement, error) {
	return s.repo.List(ctx, includeInactive)
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (*models.Achievement, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) Create(ctx context.Context, p CreateParams) (*models.Achievement, error) {
	return s.repo.Create(ctx, p)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, p UpdateParams) (*models.Achievement, error) {
	return s.repo.Update(ctx, id, p)
}

func (s *Service) UserAchievements(ctx context.Context, userID uuid.UUID) ([]models.UserAchievement, error) {
	return s.repo.ListUserAchievements(ctx, userID)
}

func (s *Service) UsersWithAchievement(ctx context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	return s.repo.ListUsersWithAchievement(ctx, id)
}

// ProgressForUser — возвращает список всех активных ачивок + флаг получено + прогресс.
type ProgressItem struct {
	Achievement models.Achievement `json:"achievement"`
	Received    bool               `json:"received"`
	Current     int                `json:"current"`
	Target      int                `json:"target"`
}

func (s *Service) ProgressForUser(ctx context.Context, userID uuid.UUID, stats *Stats) ([]ProgressItem, error) {
	achs, err := s.repo.List(ctx, false)
	if err != nil {
		return nil, err
	}
	received, err := s.repo.ListUserAchievements(ctx, userID)
	if err != nil {
		return nil, err
	}
	recSet := make(map[uuid.UUID]bool, len(received))
	for _, r := range received {
		recSet[r.AchievementID] = true
	}
	out := make([]ProgressItem, 0, len(achs))
	for _, a := range achs {
		p := s.engine.EvaluateProgress(a, stats)
		out = append(out, ProgressItem{
			Achievement: a,
			Received:    recSet[a.ID],
			Current:     p.Current,
			Target:      p.Target,
		})
	}
	return out, nil
}

func (s *Service) Engine() *Engine { return s.engine }
