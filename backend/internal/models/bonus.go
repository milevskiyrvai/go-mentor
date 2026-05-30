package models

import (
	"time"

	"github.com/google/uuid"
)

type BonusOp string

const (
	BonusOpAchievement     BonusOp = "achievement_reward"
	BonusOpDiscountConvert BonusOp = "discount_conversion"
	BonusOpOneOnOneSpend   BonusOp = "one_on_one_spend"
	BonusOpManualAdjust    BonusOp = "manual_adjustment"
	BonusOpRefund          BonusOp = "refund"
)

type BonusTransaction struct {
	ID         int64     `db:"id" json:"id"`
	UserID     uuid.UUID `db:"user_id" json:"user_id"`
	Type       BonusOp   `db:"type" json:"type"`
	Amount     int       `db:"amount" json:"amount"`
	Reason     *string   `db:"reason" json:"reason,omitempty"`
	SourceType *string   `db:"source_type" json:"source_type,omitempty"`
	SourceID   *string   `db:"source_id" json:"source_id,omitempty"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

type DiscountConversion struct {
	ID              int64     `db:"id" json:"id"`
	UserID          uuid.UUID `db:"user_id" json:"user_id"`
	BonusAmount     int       `db:"bonus_amount" json:"bonus_amount"`
	DiscountPercent float64   `db:"discount_percent" json:"discount_percent"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}

type OneOnOneStatus string

const (
	OneOnOnePending   OneOnOneStatus = "pending"
	OneOnOneApproved  OneOnOneStatus = "approved"
	OneOnOneRejected  OneOnOneStatus = "rejected"
	OneOnOneCompleted OneOnOneStatus = "completed"
	OneOnOneCancelled OneOnOneStatus = "cancelled"
)

type OneOnOneRequest struct {
	ID          uuid.UUID      `db:"id" json:"id"`
	StudentID   uuid.UUID      `db:"student_id" json:"student_id"`
	Status      OneOnOneStatus `db:"status" json:"status"`
	ProcessedBy *uuid.UUID     `db:"processed_by" json:"processed_by,omitempty"`
	ProcessedAt *time.Time     `db:"processed_at" json:"processed_at,omitempty"`
	CreatedAt   time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time      `db:"updated_at" json:"updated_at"`
}
