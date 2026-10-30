package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/notifications/dtos"
)

type NotificationEntity struct {
	ID         int64
	EmployeeID int64
	Kind       string
	Title      string
	Body       *string
	Entity     *string
	EntityID   *int64
	ReadAt     *time.Time
	CreatedAt  time.Time
}

type NotificationRepository struct{}

func NewNotificationRepository() *NotificationRepository {
	return &NotificationRepository{}
}

func (r *NotificationRepository) List(ctx context.Context, q db.DBExecutor, f dtos.NotificationFilterQuery) ([]NotificationEntity, int, error) {
	where := []string{fmt.Sprintf("employee_id = %d", f.EmployeeID)}
	if f.UnreadOnly {
		where = append(where, "read_at IS NULL")
	}

	whereClause := "WHERE " + strings.Join(where, " AND ")

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM notifications %s`, whereClause)
	var total int
	if err := q.QueryRow(ctx, countSQL).Scan(&total); err != nil {
		return nil, 0, err
	}

	pageSize := f.PageSize
	if pageSize <= 0 {
		pageSize = 30
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	selectSQL := fmt.Sprintf(`
		SELECT id, employee_id, kind, title, body, entity, entity_id, read_at, created_at
		FROM notifications
		%s
		ORDER BY created_at DESC
		LIMIT %d OFFSET %d
	`, whereClause, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]NotificationEntity, 0)
	for rows.Next() {
		var n NotificationEntity
		if err := rows.Scan(
			&n.ID, &n.EmployeeID, &n.Kind, &n.Title, &n.Body, &n.Entity, &n.EntityID, &n.ReadAt, &n.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, n)
	}

	return list, total, rows.Err()
}

func (r *NotificationRepository) MarkAsRead(ctx context.Context, q db.DBExecutor, notificationID, employeeID int64) error {
	const sql = `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = $1 AND employee_id = $2 AND read_at IS NULL`
	_, err := q.Exec(ctx, sql, notificationID, employeeID)
	return err
}

func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, q db.DBExecutor, employeeID int64) error {
	const sql = `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE employee_id = $1 AND read_at IS NULL`
	_, err := q.Exec(ctx, sql, employeeID)
	return err
}

