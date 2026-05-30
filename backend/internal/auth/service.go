package auth

import (
	"context"
	"errors"
	"slices"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrRoleNotAvailable   = errors.New("role not available for user")
)

type Service struct {
	repo *Repository
	jwt  *JWT
}

func NewService(repo *Repository, jwt *JWT) *Service {
	return &Service{repo: repo, jwt: jwt}
}

type LoginResult struct {
	Token        string
	User         *models.User
	Roles        []models.Role
	SelectedRole string
}

func (s *Service) Login(ctx context.Context, login, password string) (*LoginResult, error) {
	user, err := s.repo.GetUserByLogin(ctx, login)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !CheckPassword(user.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}

	roles, err := s.repo.GetUserRoles(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return nil, ErrInvalidCredentials
	}

	// auto-pick role if only one
	var selected string
	if len(roles) == 1 {
		selected = string(roles[0])
	}

	token, err := s.jwt.Issue(user.ID, selected)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		Token:        token,
		User:         user,
		Roles:        roles,
		SelectedRole: selected,
	}, nil
}

func (s *Service) SelectRole(ctx context.Context, userID uuid.UUID, role models.Role) (string, error) {
	if !role.Valid() {
		return "", ErrRoleNotAvailable
	}
	roles, err := s.repo.GetUserRoles(ctx, userID)
	if err != nil {
		return "", err
	}
	if !slices.Contains(roles, role) {
		return "", ErrRoleNotAvailable
	}
	return s.jwt.Issue(userID, string(role))
}

func (s *Service) Me(ctx context.Context, userID uuid.UUID) (*models.User, []models.Role, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	roles, err := s.repo.GetUserRoles(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	return user, roles, nil
}
