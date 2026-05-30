package progress

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

var ErrAlreadyApproved = errors.New("block already approved")

// Hook — наблюдатель за прогрессом, используемый для триггера ачивок/бонусов.
type Hook interface {
	OnMaterialViewed(ctx context.Context, studentID, materialID uuid.UUID, isNew bool)
	OnBlockApproved(ctx context.Context, studentID, blockID, approvedBy uuid.UUID)
}

// NoopHook — реализация по умолчанию, ничего не делает.
type NoopHook struct{}

func (NoopHook) OnMaterialViewed(context.Context, uuid.UUID, uuid.UUID, bool) {}
func (NoopHook) OnBlockApproved(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) {
}

// Notifier — §19, in-app уведомления.
type Notifier interface {
	Notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, metadata any)
}

type Service struct {
	repo     *Repository
	hook     Hook
	notifier Notifier
}

func NewService(repo *Repository, hook Hook) *Service {
	if hook == nil {
		hook = NoopHook{}
	}
	return &Service{repo: repo, hook: hook}
}

// SetHook позволяет подменить hook после конструкции (для разрыва цикла зависимостей).
func (s *Service) SetHook(hook Hook) {
	if hook == nil {
		hook = NoopHook{}
	}
	s.hook = hook
}

func (s *Service) SetNotifier(n Notifier) { s.notifier = n }

func (s *Service) notify(ctx context.Context, userID uuid.UUID, evType, title string, body *string, meta any) {
	if s.notifier != nil {
		s.notifier.Notify(ctx, userID, evType, title, body, meta)
	}
}

// MarkViewed — Student отмечает материал просмотренным. Триггерит пересчёт статуса блока.
func (s *Service) MarkViewed(ctx context.Context, studentID, materialID uuid.UUID) error {
	blockID, err := s.repo.GetMaterialBlockID(ctx, materialID)
	if err != nil {
		return err
	}

	bp, err := s.repo.GetBlockProgress(ctx, studentID, blockID)
	approved := err == nil && bp != nil && bp.Status == models.BlockApproved
	if approved {
		// Блок уже подтверждён — просто фиксируем view и не меняем статус.
		isNew, err := s.repo.MarkMaterialViewed(ctx, studentID, materialID)
		if err != nil {
			return err
		}
		s.hook.OnMaterialViewed(ctx, studentID, materialID, isNew)
		return nil
	}

	isNew, err := s.repo.MarkMaterialViewed(ctx, studentID, materialID)
	if err != nil {
		return err
	}

	if err := s.recomputeBlockStatus(ctx, studentID, blockID); err != nil {
		return err
	}

	s.hook.OnMaterialViewed(ctx, studentID, materialID, isNew)
	return nil
}

func (s *Service) UnmarkViewed(ctx context.Context, studentID, materialID uuid.UUID) error {
	blockID, err := s.repo.GetMaterialBlockID(ctx, materialID)
	if err != nil {
		return err
	}
	bp, err := s.repo.GetBlockProgress(ctx, studentID, blockID)
	if err == nil && bp != nil && bp.Status == models.BlockApproved {
		// approved блок не разрешаем снимать отметки чтобы не ломать историю
		return ErrAlreadyApproved
	}
	if err := s.repo.UnmarkMaterialViewed(ctx, studentID, materialID); err != nil {
		return err
	}
	return s.recomputeBlockStatus(ctx, studentID, blockID)
}

// recomputeBlockStatus — определяет статус блока по правилам ТЗ §7.
func (s *Service) recomputeBlockStatus(ctx context.Context, studentID, blockID uuid.UUID) error {
	counts, err := s.repo.CountMaterialsForBlock(ctx, studentID, blockID)
	if err != nil {
		return err
	}

	current, _ := s.repo.GetBlockProgress(ctx, studentID, blockID)
	if current != nil && current.Status == models.BlockApproved {
		return nil
	}

	// Правило 7.3: если все обязательные отмечены → waiting_buddy_confirmation.
	// Если обязательных нет — берём все активные материалы.
	var next models.BlockStatus
	switch {
	case counts.TotalRequired > 0 && counts.ViewedRequired >= counts.TotalRequired:
		next = models.BlockWaitingBuddy
	case counts.TotalRequired == 0 && counts.TotalActiveAll > 0 && counts.ViewedActiveAll >= counts.TotalActiveAll:
		next = models.BlockWaitingBuddy
	case counts.ViewedAll > 0:
		next = models.BlockInProgress
	default:
		next = models.BlockNotStarted
	}

	if current != nil && current.Status == next {
		return nil
	}
	return s.repo.UpsertBlockProgress(ctx, studentID, blockID, next, nil)
}

// ApproveBlock — Buddy/Admin подтверждает блок.
func (s *Service) ApproveBlock(ctx context.Context, studentID, blockID, approverID uuid.UUID) error {
	bp, _ := s.repo.GetBlockProgress(ctx, studentID, blockID)
	if bp != nil && bp.Status == models.BlockApproved {
		return ErrAlreadyApproved
	}
	// Помечаем все активные материалы блока как просмотренные.
	if err := s.repo.MarkAllMaterialsOfBlockViewed(ctx, studentID, blockID); err != nil {
		return err
	}
	if err := s.repo.UpsertBlockProgress(ctx, studentID, blockID, models.BlockApproved, &approverID); err != nil {
		return err
	}
	s.hook.OnBlockApproved(ctx, studentID, blockID, approverID)
	// §19: уведомление ученику о подтверждении блока.
	body := "Buddy подтвердил блок. Открой Roadmap, чтобы увидеть следующий этап."
	s.notify(ctx, studentID, "block_approved", "Блок подтверждён", &body, map[string]any{
		"block_id": blockID,
	})
	return nil
}

type BlockProgressSummary struct {
	BlockID         uuid.UUID          `json:"block_id"`
	Status          models.BlockStatus `json:"status"`
	TotalRequired   int                `json:"total_required"`
	ViewedRequired  int                `json:"viewed_required"`
	TotalAll        int                `json:"total_all"`
	ViewedAll       int                `json:"viewed_all"`
	ProgressPercent int                `json:"progress_percent"`
	ApprovedBy      *uuid.UUID         `json:"approved_by,omitempty"`
}

type StudentProgressSummary struct {
	Blocks               []BlockProgressSummary `json:"blocks"`
	ViewedMaterialIDs    []uuid.UUID            `json:"viewed_material_ids"`
	OverallPercent       int                    `json:"overall_percent"`
	ApprovedBlocks       int                    `json:"approved_blocks"`
	TotalActiveBlocks    int                    `json:"total_active_blocks"`
	ViewedMaterialsCount int                    `json:"viewed_materials_count"`
}

// Summary — собирает прогресс студента по всем блокам.
func (s *Service) Summary(ctx context.Context, studentID uuid.UUID, blockIDs []uuid.UUID) (*StudentProgressSummary, error) {
	statuses := map[uuid.UUID]models.BlockStatus{}
	approvedBy := map[uuid.UUID]*uuid.UUID{}
	list, err := s.repo.ListBlockProgress(ctx, studentID)
	if err != nil {
		return nil, err
	}
	for _, bp := range list {
		statuses[bp.BlockID] = bp.Status
		approvedBy[bp.BlockID] = bp.ApprovedBy
	}

	blocks := make([]BlockProgressSummary, 0, len(blockIDs))
	totalReqAll := 0
	viewedReqAll := 0
	for _, bid := range blockIDs {
		c, err := s.repo.CountMaterialsForBlock(ctx, studentID, bid)
		if err != nil {
			return nil, err
		}
		var pct int
		switch {
		case c.TotalRequired > 0:
			pct = c.ViewedRequired * 100 / c.TotalRequired
		case c.TotalActiveAll > 0:
			pct = c.ViewedActiveAll * 100 / c.TotalActiveAll
		}
		st, ok := statuses[bid]
		if !ok {
			st = models.BlockNotStarted
		}
		blocks = append(blocks, BlockProgressSummary{
			BlockID:         bid,
			Status:          st,
			TotalRequired:   c.TotalRequired,
			ViewedRequired:  c.ViewedRequired,
			TotalAll:        c.TotalAll,
			ViewedAll:       c.ViewedAll,
			ProgressPercent: pct,
			ApprovedBy:      approvedBy[bid],
		})
		totalReqAll += c.TotalRequired
		viewedReqAll += c.ViewedRequired
	}

	overall := 0
	if totalReqAll > 0 {
		overall = viewedReqAll * 100 / totalReqAll
	}

	approved, _ := s.repo.CountApprovedBlocks(ctx, studentID)
	totalBlocks, _ := s.repo.CountTotalActiveBlocks(ctx)
	viewedCnt, _ := s.repo.CountViewedMaterials(ctx, studentID)

	viewedMaterials, _ := s.repo.ListViewedMaterials(ctx, studentID)
	viewedIDs := make([]uuid.UUID, 0, len(viewedMaterials))
	for _, mp := range viewedMaterials {
		viewedIDs = append(viewedIDs, mp.MaterialID)
	}

	return &StudentProgressSummary{
		Blocks:               blocks,
		ViewedMaterialIDs:    viewedIDs,
		OverallPercent:       overall,
		ApprovedBlocks:       approved,
		TotalActiveBlocks:    totalBlocks,
		ViewedMaterialsCount: viewedCnt,
	}, nil
}
