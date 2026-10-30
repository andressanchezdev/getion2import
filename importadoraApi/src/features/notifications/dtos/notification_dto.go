package dtos

import "time"

type NotificationResponse struct {
	ID         int64      `json:"id"`
	EmployeeID int64      `json:"employeeId"`
	Kind       string     `json:"kind"` // 'info' | 'success' | 'warning' | 'error'
	Title      string     `json:"title"`
	Body       *string    `json:"body,omitempty"`
	Entity     *string    `json:"entity,omitempty"`
	EntityID   *int64     `json:"entityId,omitempty"`
	ReadAt     *time.Time `json:"readAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type NotificationFilterQuery struct {
	EmployeeID int64
	UnreadOnly bool
	Page       int
	PageSize   int
}

