package models

import (
	"time"

	"github.com/google/uuid"
)

type InterviewType string

const (
	InterviewMock InterviewType = "mock"
	InterviewReal InterviewType = "real"
)

type InterviewStatus string

const (
	InterviewSubmitted InterviewStatus = "submitted"
	InterviewReviewed  InterviewStatus = "reviewed"
	InterviewCompleted InterviewStatus = "completed"
	InterviewScheduled InterviewStatus = "scheduled"
	InterviewCancelled InterviewStatus = "cancelled"
)

type InterviewResult string

const (
	InterviewResultOffer    InterviewResult = "offer"
	InterviewResultReject   InterviewResult = "reject"
	InterviewResultPending  InterviewResult = "pending"
	InterviewResultNoResult InterviewResult = "no_result"
)

type Interview struct {
	ID        uuid.UUID     `db:"id" json:"id"`
	Type      InterviewType `db:"type" json:"type"`
	StudentID uuid.UUID     `db:"student_id" json:"student_id"`
	BuddyID   *uuid.UUID    `db:"buddy_id" json:"buddy_id,omitempty"`
	URL       *string       `db:"url" json:"url,omitempty"`
	Company   *string       `db:"company" json:"company,omitempty"`
	Position  *string       `db:"position" json:"position,omitempty"`
	Grade     *string       `db:"grade" json:"grade,omitempty"`
	Stack     *string       `db:"stack" json:"stack,omitempty"`
	Date      *time.Time    `db:"date" json:"date,omitempty"`
	Status    string        `db:"status" json:"status"`
	Result    *string       `db:"result" json:"result,omitempty"`
	Feedback  *string       `db:"feedback" json:"feedback,omitempty"`
	CreatedAt time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt time.Time     `db:"updated_at" json:"updated_at"`
}

type FinalCheckType string

const (
	FinalTechnical FinalCheckType = "final_technical"
	FinalRoast     FinalCheckType = "final_roast"
)

type FinalCheckStatus string

const (
	FinalNotAvailable FinalCheckStatus = "not_available"
	FinalAvailable    FinalCheckStatus = "available"
	FinalScheduled    FinalCheckStatus = "scheduled"
	FinalCompleted    FinalCheckStatus = "completed"
	FinalFailed       FinalCheckStatus = "failed"
)

type FinalCheck struct {
	ID          uuid.UUID        `db:"id" json:"id"`
	StudentID   uuid.UUID        `db:"student_id" json:"student_id"`
	BuddyID     *uuid.UUID       `db:"buddy_id" json:"buddy_id,omitempty"`
	Type        FinalCheckType   `db:"type" json:"type"`
	Status      FinalCheckStatus `db:"status" json:"status"`
	ScheduledAt *time.Time       `db:"scheduled_at" json:"scheduled_at,omitempty"`
	CompletedAt *time.Time       `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt   time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time        `db:"updated_at" json:"updated_at"`
}

type CalendarEventType string

const (
	EventMockInterview  CalendarEventType = "mock_interview"
	EventRealInterview  CalendarEventType = "real_interview"
	EventBlockReview    CalendarEventType = "block_review"
	EventFinalTechnical CalendarEventType = "final_technical"
	EventFinalRoast     CalendarEventType = "final_roast"
	EventCustom         CalendarEventType = "custom"
)

type CalendarEvent struct {
	ID              uuid.UUID         `db:"id" json:"id"`
	Title           string            `db:"title" json:"title"`
	StudentID       *uuid.UUID        `db:"student_id" json:"student_id,omitempty"`
	BuddyID         *uuid.UUID        `db:"buddy_id" json:"buddy_id,omitempty"`
	Type            CalendarEventType `db:"type" json:"type"`
	StartDatetime   time.Time         `db:"start_datetime" json:"start_datetime"`
	EndDatetime     *time.Time        `db:"end_datetime" json:"end_datetime,omitempty"`
	Description     *string           `db:"description" json:"description,omitempty"`
	ReminderEnabled bool              `db:"reminder_enabled" json:"reminder_enabled"`
	CreatedAt       time.Time         `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time         `db:"updated_at" json:"updated_at"`
}
