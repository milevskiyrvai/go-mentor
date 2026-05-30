package achievements

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"github.com/itrostik/gomentor/internal/models"
)

// Stats — набор показателей по студенту, нужный для оценки условий.
type Stats struct {
	ViewedMaterials      int
	ApprovedBlocksByIdx  map[int]bool // ключ — 1..N по sort_order активных блоков
	MockInterviews       int          // status=completed
	RealInterviews       int          // загруженные (любого статуса)
	ProfileCompleted     bool         // avatar + about + display_name заполнены
	FinalTechnicalDone   bool
	FinalRoastDone       bool
	OneOnOneApprovedDone bool
}

// StatsProvider — поставляет статистику по конкретному студенту.
type StatsProvider interface {
	CollectStats(ctx context.Context, studentID uuid.UUID) (*Stats, error)
}

// BonusAwarder — начисляет бонусы за ачивку.
type BonusAwarder interface {
	AwardAchievement(ctx context.Context, userID uuid.UUID, amount int, achievementID uuid.UUID, title string) error
}

// Notifier — публикует уведомление о новой ачивке.
type Notifier interface {
	NotifyAchievement(ctx context.Context, userID uuid.UUID, a models.Achievement)
}

type noopNotifier struct{}

func (noopNotifier) NotifyAchievement(context.Context, uuid.UUID, models.Achievement) {}

// Engine реализует progress.Hook и проверяет ачивки.
type Engine struct {
	repo  *Repository
	stats StatsProvider
	bonus BonusAwarder
	notif Notifier
}

func NewEngine(repo *Repository, stats StatsProvider, bonus BonusAwarder, notif Notifier) *Engine {
	if notif == nil {
		notif = noopNotifier{}
	}
	return &Engine{repo: repo, stats: stats, bonus: bonus, notif: notif}
}

// Реализация progress.Hook:

func (e *Engine) OnMaterialViewed(ctx context.Context, studentID, _ uuid.UUID, _ bool) {
	if err := e.EvaluateAll(ctx, studentID); err != nil {
		slog.Error("achievements: evaluate after material view", "err", err)
	}
}

func (e *Engine) OnBlockApproved(ctx context.Context, studentID, _, _ uuid.UUID) {
	if err := e.EvaluateAll(ctx, studentID); err != nil {
		slog.Error("achievements: evaluate after block approved", "err", err)
	}
}

// EvaluateAll — проверяет все активные ачивки для пользователя и выдаёт недостающие.
func (e *Engine) EvaluateAll(ctx context.Context, userID uuid.UUID) error {
	achs, err := e.repo.List(ctx, false)
	if err != nil {
		return err
	}
	if len(achs) == 0 {
		return nil
	}
	stats, err := e.stats.CollectStats(ctx, userID)
	if err != nil {
		return err
	}

	for _, a := range achs {
		ok, _ := e.evaluate(a, stats)
		if !ok {
			continue
		}
		granted, err := e.repo.GrantIfMissing(ctx, userID, a.ID)
		if err != nil {
			slog.Error("achievements: grant", "achievement", a.Title, "err", err)
			continue
		}
		if !granted {
			continue
		}
		if a.RewardBonus > 0 {
			if err := e.bonus.AwardAchievement(ctx, userID, a.RewardBonus, a.ID, a.Title); err != nil {
				slog.Error("achievements: award bonus", "err", err)
			}
		}
		e.notif.NotifyAchievement(ctx, userID, a)
	}
	return nil
}

// EvaluateProgress — возвращает прогресс по ачивке (current/target), не выдавая её.
type ProgressInfo struct {
	Current int
	Target  int
}

func (e *Engine) EvaluateProgress(a models.Achievement, stats *Stats) ProgressInfo {
	switch a.ConditionType {
	case models.CondMaterialsViewed:
		var p struct {
			Count int `json:"count"`
		}
		_ = json.Unmarshal(a.ConditionParams, &p)
		return ProgressInfo{Current: stats.ViewedMaterials, Target: p.Count}
	case models.CondBlockApproved:
		var p struct {
			BlockIndex int `json:"block_index"`
		}
		_ = json.Unmarshal(a.ConditionParams, &p)
		if stats.ApprovedBlocksByIdx[p.BlockIndex] {
			return ProgressInfo{Current: 1, Target: 1}
		}
		return ProgressInfo{Current: 0, Target: 1}
	case models.CondInterviewsCount:
		var p struct {
			Type  string `json:"type"`
			Count int    `json:"count"`
		}
		_ = json.Unmarshal(a.ConditionParams, &p)
		cur := stats.MockInterviews
		if p.Type == "real" {
			cur = stats.RealInterviews
		}
		return ProgressInfo{Current: cur, Target: p.Count}
	case models.CondProfileCompleted:
		c := 0
		if stats.ProfileCompleted {
			c = 1
		}
		return ProgressInfo{Current: c, Target: 1}
	case models.CondFinalsCompleted:
		c := 0
		if stats.FinalTechnicalDone {
			c++
		}
		if stats.FinalRoastDone {
			c++
		}
		return ProgressInfo{Current: c, Target: 2}
	case models.CondFirstOneOnOne:
		c := 0
		if stats.OneOnOneApprovedDone {
			c = 1
		}
		return ProgressInfo{Current: c, Target: 1}
	}
	return ProgressInfo{Current: 0, Target: 1}
}

func (e *Engine) evaluate(a models.Achievement, stats *Stats) (bool, error) {
	p := e.EvaluateProgress(a, stats)
	return p.Target > 0 && p.Current >= p.Target, nil
}
