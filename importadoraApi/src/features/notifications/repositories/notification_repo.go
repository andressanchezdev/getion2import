package repositories

// notification_repo.go · acceso a la base de notificaciones: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de notificaciones; los usan los services de notificaciones

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/notifications/dtos"
)

type NotificationEntity struct {
	ID         int64
	EmployeeID *int64
	AdminID    *int64
	Kind       string
	Title      string
	Body       *string
	Entity     *string
	EntityID   *int64
	ReadAt     *time.Time
	CreatedAt  time.Time
}

type NotificationRepository struct{}

// NewNotificationRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewNotificationRepository() *NotificationRepository {
	return &NotificationRepository{}
}

// List lista las notificaciones según los filtros, con su total para paginar.
func (r *NotificationRepository) List(ctx context.Context, q db.DBExecutor, f dtos.NotificationFilterQuery) ([]NotificationEntity, int, error) {
	recipientColumn, err := notificationRecipientColumn(f.ActorType)
	if err != nil {
		return nil, 0, err
	}
	where := []string{fmt.Sprintf("%s = $1", recipientColumn)}
	args := []interface{}{f.ActorID}
	if f.UnreadOnly {
		where = append(where, "read_at IS NULL")
	}

	whereClause := "WHERE " + strings.Join(where, " AND ")

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM notifications %s`, whereClause)
	var total int
	if err := q.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
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
		SELECT id, employee_id, admin_id, kind, title, body, entity, entity_id, read_at, created_at
		FROM notifications
		%s
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, whereClause)
	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]NotificationEntity, 0)
	for rows.Next() {
		var n NotificationEntity
		if err := rows.Scan(
			&n.ID, &n.EmployeeID, &n.AdminID, &n.Kind, &n.Title, &n.Body, &n.Entity, &n.EntityID, &n.ReadAt, &n.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, n)
	}

	return list, total, rows.Err()
}

// MarkAsRead marca una notificación como leída.
func (r *NotificationRepository) MarkAsRead(ctx context.Context, q db.DBExecutor, actorType string, notificationID, actorID int64) error {
	column, err := notificationRecipientColumn(actorType)
	if err != nil {
		return err
	}
	sql := fmt.Sprintf(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = $1 AND %s = $2 AND read_at IS NULL`, column)
	_, err = q.Exec(ctx, sql, notificationID, actorID)
	return err
}

// MarkAllAsRead marca como leídas todas las notificaciones del destinatario.
func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, q db.DBExecutor, actorType string, actorID int64) error {
	column, err := notificationRecipientColumn(actorType)
	if err != nil {
		return err
	}
	sql := fmt.Sprintf(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE %s = $1 AND read_at IS NULL`, column)
	_, err = q.Exec(ctx, sql, actorID)
	return err
}

func (r *NotificationRepository) CreateCompanyAdminNotification(ctx context.Context, q db.DBExecutor, companyID int64, title, body, entity string, entityID int64) error {
	const sql = `
		INSERT INTO notifications (admin_id, kind, title, body, entity, entity_id)
		SELECT id, 'restore_record', $2, $3, $4, $5
		FROM admins
		WHERE company_id = $1
	`
	tag, err := q.Exec(ctx, sql, companyID, title, body, entity, entityID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("no existe un administrador asociado a la compañía para notificar la restauración")
	}
	return nil
}

func notificationRecipientColumn(actorType string) (string, error) {
	switch actorType {
	case "employee":
		return "employee_id", nil
	case "admin":
		return "admin_id", nil
	default:
		return "", errors.New("tipo de actor no compatible con notificaciones")
	}
}
