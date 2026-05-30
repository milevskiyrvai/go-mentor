package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Achievement struct {
	ID              uuid.UUID       `db:"id" json:"id"`
	Title           string          `db:"title" json:"title"`
	Description     *string         `db:"description" json:"description,omitempty"`
	RewardBonus     int             `db:"reward_bonus" json:"reward_bonus"`
	ImageURL        *string         `db:"image_url" json:"image_url,omitempty"`
	ConditionType   string          `db:"condition_type" json:"condition_type"`
	ConditionParams json.RawMessage `db:"condition_params" json:"condition_params"`
	IsActive        bool            `db:"is_active" json:"is_active"`
	SortOrder       int             `db:"sort_order" json:"sort_order"`
	CreatedAt       time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time       `db:"updated_at" json:"updated_at"`
}

type UserAchievement struct {
	ID            int64     `db:"id" json:"id"`
	UserID        uuid.UUID `db:"user_id" json:"user_id"`
	AchievementID uuid.UUID `db:"achievement_id" json:"achievement_id"`
	ReceivedAt    time.Time `db:"received_at" json:"received_at"`
}

// Стандартные condition_type:
const (
	CondMaterialsViewed     = "materials_viewed_count"     // params: {count: int}
	CondBlockApproved       = "block_approved"             // params: {block_index: int}  (1..N по sort_order активных)
	CondInterviewsCount     = "interviews_count"           // params: {type: "mock"|"real", count: int}
	CondProfileCompleted    = "profile_completed"          // params: {}
	CondFinalsCompleted     = "finals_completed"           // params: {} (обе финалки)
	CondFirstOneOnOne       = "first_one_on_one_approved"  // params: {}
)
