package roadmap

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

var ErrInvalidInput = errors.New("invalid input")

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Blocks

func (s *Service) ListBlocks(ctx context.Context, includeInactive bool) ([]models.RoadmapBlock, error) {
	return s.repo.ListBlocks(ctx, includeInactive)
}

func (s *Service) GetBlock(ctx context.Context, id uuid.UUID) (*models.RoadmapBlock, error) {
	return s.repo.GetBlock(ctx, id)
}

func (s *Service) CreateBlock(ctx context.Context, title, description string) (*models.RoadmapBlock, error) {
	if strings.TrimSpace(title) == "" {
		return nil, ErrInvalidInput
	}
	return s.repo.CreateBlock(ctx, title, description)
}

func (s *Service) UpdateBlock(ctx context.Context, id uuid.UUID, p UpdateBlockParams) (*models.RoadmapBlock, error) {
	return s.repo.UpdateBlock(ctx, id, p)
}

func (s *Service) DeleteBlock(ctx context.Context, id uuid.UUID) error {
	return s.repo.SoftDeleteBlock(ctx, id)
}

func (s *Service) ReorderBlocks(ctx context.Context, orderedIDs []uuid.UUID) error {
	return s.repo.ReorderBlocks(ctx, orderedIDs)
}

// Materials

func (s *Service) ListMaterials(ctx context.Context, blockID uuid.UUID, includeInactive bool) ([]models.RoadmapMaterial, error) {
	return s.repo.ListMaterialsByBlock(ctx, blockID, includeInactive)
}

func (s *Service) GetMaterial(ctx context.Context, id uuid.UUID) (*models.RoadmapMaterial, error) {
	return s.repo.GetMaterial(ctx, id)
}

func (s *Service) CreateMaterial(ctx context.Context, p CreateMaterialParams) (*models.RoadmapMaterial, error) {
	if strings.TrimSpace(p.Title) == "" || !p.Type.Valid() || !p.ContentType.Valid() {
		return nil, ErrInvalidInput
	}
	// Авто-fetch preview если URL задан и preview-поля пустые.
	if p.URL != nil && *p.URL != "" && p.PreviewTitle == nil && p.PreviewDescription == nil {
		if prev, err := FetchPreview(ctx, *p.URL); err == nil && prev != nil {
			if prev.Title != "" {
				t := prev.Title
				p.PreviewTitle = &t
			}
			if prev.Description != "" {
				d := prev.Description
				p.PreviewDescription = &d
			}
			if prev.Image != "" {
				i := prev.Image
				p.PreviewImage = &i
			}
			if prev.Source != "" && p.Source == nil {
				src := prev.Source
				p.Source = &src
			}
		}
	}
	return s.repo.CreateMaterial(ctx, p)
}

func (s *Service) UpdateMaterial(ctx context.Context, id uuid.UUID, p UpdateMaterialParams) (*models.RoadmapMaterial, error) {
	if p.Type != nil && !p.Type.Valid() {
		return nil, ErrInvalidInput
	}
	if p.ContentType != nil && !p.ContentType.Valid() {
		return nil, ErrInvalidInput
	}
	return s.repo.UpdateMaterial(ctx, id, p)
}

func (s *Service) DeleteMaterial(ctx context.Context, id uuid.UUID) error {
	return s.repo.SoftDeleteMaterial(ctx, id)
}

func (s *Service) ReorderMaterials(ctx context.Context, blockID uuid.UUID, orderedIDs []uuid.UUID) error {
	return s.repo.ReorderMaterials(ctx, blockID, orderedIDs)
}
