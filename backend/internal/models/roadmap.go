package models

import (
	"time"

	"github.com/google/uuid"
)

type RoadmapBlock struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	Title       string     `db:"title" json:"title"`
	Description *string    `db:"description" json:"description,omitempty"`
	SortOrder   int        `db:"sort_order" json:"sort_order"`
	IsActive    bool       `db:"is_active" json:"is_active"`
	DeletedAt   *time.Time `db:"deleted_at" json:"-"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
}

type MaterialType string

const (
	MaterialTypeTheory    MaterialType = "theory"
	MaterialTypeQuestions MaterialType = "questions"
	MaterialTypePractice  MaterialType = "practice"
	MaterialTypeHomework  MaterialType = "homework"
)

func (t MaterialType) Valid() bool {
	switch t {
	case MaterialTypeTheory, MaterialTypeQuestions, MaterialTypePractice, MaterialTypeHomework:
		return true
	}
	return false
}

type ContentType string

const (
	ContentTypeURL     ContentType = "url"
	ContentTypeYouTube ContentType = "youtube"
	ContentTypeGitHub  ContentType = "github"
	ContentTypeArticle ContentType = "article"
	ContentTypeText    ContentType = "text"
	ContentTypeFile    ContentType = "file"
)

func (t ContentType) Valid() bool {
	switch t {
	case ContentTypeURL, ContentTypeYouTube, ContentTypeGitHub, ContentTypeArticle, ContentTypeText, ContentTypeFile:
		return true
	}
	return false
}

type RoadmapMaterial struct {
	ID                 uuid.UUID    `db:"id" json:"id"`
	BlockID            uuid.UUID    `db:"block_id" json:"block_id"`
	Title              string       `db:"title" json:"title"`
	Description        *string      `db:"description" json:"description,omitempty"`
	Type               MaterialType `db:"type" json:"type"`
	ContentType        ContentType  `db:"content_type" json:"content_type"`
	URL                *string      `db:"url" json:"url,omitempty"`
	Content            *string      `db:"content" json:"content,omitempty"`
	PreviewTitle       *string      `db:"preview_title" json:"preview_title,omitempty"`
	PreviewDescription *string      `db:"preview_description" json:"preview_description,omitempty"`
	PreviewImage       *string      `db:"preview_image" json:"preview_image,omitempty"`
	Source             *string      `db:"source" json:"source,omitempty"`
	IsRequired         bool         `db:"is_required" json:"is_required"`
	IsActive           bool         `db:"is_active" json:"is_active"`
	SortOrder          int          `db:"sort_order" json:"sort_order"`
	DeletedAt          *time.Time   `db:"deleted_at" json:"-"`
	CreatedAt          time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time    `db:"updated_at" json:"updated_at"`
}
