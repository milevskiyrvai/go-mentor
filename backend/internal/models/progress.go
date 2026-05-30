package models

import (
	"time"

	"github.com/google/uuid"
)

type BlockStatus string

const (
	BlockNotStarted   BlockStatus = "not_started"
	BlockInProgress   BlockStatus = "in_progress"
	BlockWaitingBuddy BlockStatus = "waiting_buddy_confirmation"
	BlockApproved     BlockStatus = "approved"
)

type MaterialProgress struct {
	ID         int64     `db:"id" json:"-"`
	StudentID  uuid.UUID `db:"student_id" json:"student_id"`
	MaterialID uuid.UUID `db:"material_id" json:"material_id"`
	ViewedAt   time.Time `db:"viewed_at" json:"viewed_at"`
	CreatedAt  time.Time `db:"created_at" json:"-"`
}

type BlockProgress struct {
	ID         int64       `db:"id" json:"-"`
	StudentID  uuid.UUID   `db:"student_id" json:"student_id"`
	BlockID    uuid.UUID   `db:"block_id" json:"block_id"`
	Status     BlockStatus `db:"status" json:"status"`
	ApprovedBy *uuid.UUID  `db:"approved_by" json:"approved_by,omitempty"`
	ApprovedAt *time.Time  `db:"approved_at" json:"approved_at,omitempty"`
	CreatedAt  time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time   `db:"updated_at" json:"updated_at"`
}
