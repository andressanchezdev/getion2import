package repositories

// permission_repo.go · acceso a la base de personal (administradores, empleados, roles y permisos): aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de personal (administradores, empleados, roles y permisos); los usan los services de personal (administradores, empleados, roles y permisos)

import (
	"context"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/staff/dtos"
)

type PermissionRepository struct{}

// NewPermissionRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewPermissionRepository() *PermissionRepository {
	return &PermissionRepository{}
}

// ListAll lista el catálogo completo de permisos.
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

// ListByEmployeeID lista los permisos que tiene asignados un empleado.
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

