package repositories

import (
	"context"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/staff/dtos"
)

type PermissionEntity struct {
	ID          int64
	Module      string
	Action      string
	Description *string
}

type PermissionRepository struct{}

func NewPermissionRepository() *PermissionRepository {
	return &PermissionRepository{}
}

func (r *PermissionRepository) ListAll(ctx context.Context, q db.DBExecutor) ([]dtos.PermissionResponse, error) {
	const sql = `
		SELECT id, module, action, description
		FROM permissions
		ORDER BY module ASC, action ASC
	`
	rows, err := q.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]dtos.PermissionResponse, 0)
	for rows.Next() {
		var p dtos.PermissionResponse
		if err := rows.Scan(&p.ID, &p.Module, &p.Action, &p.Description); err != nil {
			return nil, err
		}
		list = append(list, p)
	}

	return list, rows.Err()
}

func (r *PermissionRepository) ListByEmployeeID(ctx context.Context, q db.DBExecutor, employeeID int64) ([]dtos.PermissionResponse, error) {
	const sql = `
		SELECT p.id, p.module, p.action, p.description
		FROM permissions p
		INNER JOIN employee_permissions ep ON ep.permission_id = p.id
		WHERE ep.employee_id = $1
		ORDER BY p.module ASC, p.action ASC
	`
	rows, err := q.Query(ctx, sql, employeeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]dtos.PermissionResponse, 0)
	for rows.Next() {
		var p dtos.PermissionResponse
		if err := rows.Scan(&p.ID, &p.Module, &p.Action, &p.Description); err != nil {
			return nil, err
		}
		list = append(list, p)
	}

	return list, rows.Err()
}

