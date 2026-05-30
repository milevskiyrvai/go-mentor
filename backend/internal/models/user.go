package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	Login             string     `db:"login" json:"login"`
	PasswordHash      string     `db:"password_hash" json:"-"`
	DisplayName       string     `db:"display_name" json:"display_name"`
	AvatarURL         *string    `db:"avatar_url" json:"avatar_url,omitempty"`
	About             *string    `db:"about" json:"about,omitempty"`
	TelegramUsername  *string    `db:"telegram_username" json:"telegram_username,omitempty"`
	LearningStartedAt *time.Time `db:"learning_started_at" json:"learning_started_at,omitempty"`
	IsProfilePrivate  bool       `db:"is_profile_private" json:"is_profile_private"`
	IsDeleted         bool       `db:"is_deleted" json:"-"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`
}

type Role string

const (
	RoleStudent Role = "student"
	RoleBuddy   Role = "buddy"
	RoleAdmin   Role = "admin"
)

func (r Role) Valid() bool {
	switch r {
	case RoleStudent, RoleBuddy, RoleAdmin:
		return true
	}
	return false
}
