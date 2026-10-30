package dtos

import (
	"encoding/json"
	"time"
)

type RecycleBinItemResponse struct {
	ID                  int64           `json:"id"`
	CompanyID           *int64          `json:"companyId,omitempty"`
	EntityTable         string          `json:"entityTable"`
	EntityID            int64           `json:"entityId"`
	EntityLabel         string          `json:"entityLabel"`
	EntityData          json.RawMessage `json:"entityData"`
	DeletedByActorType  string          `json:"deletedByActorType"`
	DeletedByActorID    int64           `json:"deletedByActorId"`
	DeletedByActorName  string          `json:"deletedByActorName"`
	DeletedAt           time.Time       `json:"deletedAt"`
	IsRestored          bool            `json:"isRestored"`
	RestoredAt          *time.Time      `json:"restoredAt,omitempty"`
	RestoredByActorID   *int64          `json:"restoredByActorId,omitempty"`
	RestoredByActorName *string         `json:"restoredByActorName,omitempty"`
}

type RecycleBinFilterQuery struct {
	CompanyID   *int64
	EntityTable string
	IsRestored  *bool
	Search      string
	Page        int
	PageSize    int
}

