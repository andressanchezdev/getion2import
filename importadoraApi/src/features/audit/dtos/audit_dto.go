package dtos

import (
	"encoding/json"
	"time"
)

type AuditLogResponse struct {
	ID        int64           `json:"id"`
	CompanyID *int64          `json:"companyId,omitempty"`
	ActorType string          `json:"actorType"`
	ActorID   *int64          `json:"actorId,omitempty"`
	ActorName string          `json:"actorName"`
	Entity    string          `json:"entity"`
	EntityID  *int64          `json:"entityId,omitempty"`
	Action    string          `json:"action"`
	Reason    *string         `json:"reason,omitempty"`
	Changes   json.RawMessage `json:"changes,omitempty"`
	IPAddress string          `json:"ipAddress"`
	UserAgent string          `json:"userAgent"`
	CreatedAt time.Time       `json:"createdAt"`
}

type AuditLogFilterQuery struct {
	CompanyID *int64
	Entity    string
	Action    string
	Page      int
	PageSize  int
}

