package repositories

// employee_access_repo · credenciales, permisos, desbloqueo y vendedores
// conecta con: EmployeeRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en employee_repo.go)

import (
	"context"
	"errors"

	"importadoraApi/src/core/db"
)

// UpdateCredentials cambia la contraseña del empleado.
func (r *EmployeeRepository) UpdateCredentials(ctx context.Context, q db.DBExecutor, id int64, passwordHash string) error {
	const sql = `UPDATE employees SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`
	cmdTag, err := q.Exec(ctx, sql, passwordHash, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("empleado no encontrado")
	}
	return nil
}

// AssignPermissions reemplaza los permisos del empleado por los indicados.
func (r *EmployeeRepository) AssignPermissions(ctx context.Context, q db.DBExecutor, employeeID int64, permissionIDs []int64, grantedByAdminID, grantedByEmployeeID *int64) error {
	// Borrar permisos previos
	const deleteSQL = `DELETE FROM employee_permissions WHERE employee_id = $1`
	if _, err := q.Exec(ctx, deleteSQL, employeeID); err != nil {
		return err
	}

	if len(permissionIDs) == 0 {
		return nil
	}

	// Insertar permisos en lote
	insertSQL := `
		INSERT INTO employee_permissions (employee_id, permission_id, granted_by_admin_id, granted_by_employee_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (employee_id, permission_id) DO NOTHING
	`
	for _, permID := range permissionIDs {
		if _, err := q.Exec(ctx, insertSQL, employeeID, permID, grantedByAdminID, grantedByEmployeeID); err != nil {
			return err
		}
	}
	return nil
}

// UnlockEmployee desbloquea al empleado y reinicia sus intentos fallidos de ingreso.
func (r *EmployeeRepository) UnlockEmployee(ctx context.Context, q db.DBExecutor, employeeID int64) error {
	// 1. Limpiar intentos de login
	const resetAttemptsSQL = `
		UPDATE employee_login_attempts
		SET failed_login_count = 0,
		    blocked_until = NULL,
		    updated_at = CURRENT_TIMESTAMP
		WHERE employee_id = $1
	`
	_, err := q.Exec(ctx, resetAttemptsSQL, employeeID)
	if err != nil {
		return err
	}

	// 2. Reactivar estado en employees si estaba bloqueado
	const activateSQL = `
		UPDATE employees
		SET status = 'active',
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND status = 'blocked' AND deleted_at IS NULL
	`
	_, _ = q.Exec(ctx, activateSQL, employeeID)
	return nil
}

// ListSalespersons lista a los empleados que pueden vender, para asignarles un pedido.
func (r *EmployeeRepository) ListSalespersons(ctx context.Context, q db.DBExecutor, companyID int64) ([]EmployeeEntity, error) {
	const sql = `
		SELECT
			e.id, e.company_id, e.role_id, COALESCE(r.name, ''),
			e.warehouse_id, w.name,
			e.email, '', e.first_name, e.last_name, e.full_name,
			e.document_type, e.document, e.phone, e.address, e.photo_url,
			e.work_modality, e.employment_status, e.status, e.last_login_at,
			e.created_at, e.updated_at, e.deleted_at
		FROM employees e
		LEFT JOIN roles r ON r.id = e.role_id
		LEFT JOIN warehouses w ON w.id = e.warehouse_id
		WHERE e.company_id = $1
		  AND e.status = 'active'
		  AND e.deleted_at IS NULL
		  AND (r.code = 'vendedor' OR LOWER(r.name) LIKE '%vendedor%' OR LOWER(r.name) LIKE '%comercial%' OR LOWER(r.name) LIKE '%vent%')
		ORDER BY e.full_name ASC
	`
	rows, err := q.Query(ctx, sql, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []EmployeeEntity
	for rows.Next() {
		var e EmployeeEntity
		if err := rows.Scan(
			&e.ID, &e.CompanyID, &e.RoleID, &e.RoleName,
			&e.WarehouseID, &e.WarehouseName,
			&e.Email, &e.PasswordHash, &e.FirstName, &e.LastName, &e.FullName,
			&e.DocumentType, &e.Document, &e.Phone, &e.Address, &e.PhotoURL,
			&e.WorkModality, &e.EmploymentStatus, &e.Status, &e.LastLoginAt,
			&e.CreatedAt, &e.UpdatedAt, &e.DeletedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}
