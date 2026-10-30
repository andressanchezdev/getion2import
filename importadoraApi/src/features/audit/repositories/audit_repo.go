package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/audit/dtos"
)

type AuditLogQueryEntity struct {
	ID        int64
	CompanyID *int64
	ActorType string
	ActorID   *int64
	ActorName string
	Entity    string
	EntityID  *int64
	Action    string
	Reason    *string
	Changes   []byte
	IPAddress string
	UserAgent string
	CreatedAt time.Time
}

type AuditLogQueryRepository struct{}

func NewAuditLogQueryRepository() *AuditLogQueryRepository {
	return &AuditLogQueryRepository{}
}

func (r *AuditLogQueryRepository) List(ctx context.Context, q db.DBExecutor, f dtos.AuditLogFilterQuery) ([]AuditLogQueryEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("(al.company_id = $%d OR al.company_id IS NULL)", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if strings.TrimSpace(f.Entity) != "" {
		where = append(where, fmt.Sprintf("al.entity = $%d", argIdx))
		args = append(args, strings.TrimSpace(f.Entity))
		argIdx++
	}

	if strings.TrimSpace(f.Action) != "" {
		where = append(where, fmt.Sprintf("al.action ILIKE $%d", argIdx))
		args = append(args, "%"+strings.TrimSpace(f.Action)+"%")
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM audit_logs al %s`, whereClause)
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
		SELECT
			al.id, al.company_id,
			CASE
				WHEN al.superadmin_id IS NOT NULL THEN 'superadmin'
				WHEN al.admin_id IS NOT NULL THEN 'admin'
				WHEN al.employee_id IS NOT NULL THEN 'employee'
				ELSE 'system'
			END AS actor_type,
			COALESCE(al.superadmin_id, al.admin_id, al.employee_id) AS actor_id,
			COALESCE(sa.full_name, ad.full_name, emp.full_name, 'Sistema') AS actor_name,
			al.entity, al.entity_id, al.action, al.reason, al.changes,
			COALESCE(al.ip_address, ''), COALESCE(al.user_agent, ''), al.created_at
		FROM audit_logs al
		LEFT JOIN superadmins sa ON sa.id = al.superadmin_id
		LEFT JOIN admins ad ON ad.id = al.admin_id
		LEFT JOIN employees emp ON emp.id = al.employee_id
		%s
		ORDER BY al.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]AuditLogQueryEntity, 0)
	for rows.Next() {
		var it AuditLogQueryEntity
		if err := rows.Scan(
			&it.ID, &it.CompanyID, &it.ActorType, &it.ActorID, &it.ActorName,
			&it.Entity, &it.EntityID, &it.Action, &it.Reason, &it.Changes,
			&it.IPAddress, &it.UserAgent, &it.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, it)
	}

	return list, total, rows.Err()
}

