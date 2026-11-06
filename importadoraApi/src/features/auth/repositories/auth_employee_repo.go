package repositories

// auth_employee_repo · búsqueda de empleados para el ingreso
// conecta con: AuthRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en auth_repo.go)

import (
	"context"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
)

// FindEmployeeByEmail busca un empleado por su correo.
func (r *AuthRepository) FindEmployeeByEmail(ctx context.Context, q db.DBExecutor, email string) (*ActorAccount, error) {
	const sqlQuery = `
		SELECT
			e.id, e.company_id, c.name, c.is_active,
			e.role_id, rl.code, rl.name,
			e.warehouse_id, COALESCE(w.code, ''), COALESCE(w.name, ''), COALESCE(w.is_active, FALSE),
			e.email, e.password_hash, e.first_name, e.last_name, e.full_name,
			e.document_type, COALESCE(e.document, ''), COALESCE(e.phone, ''),
			COALESCE(e.address, ''), COALESCE(e.photo_url, ''),
			e.work_modality, e.employment_status, e.status, e.last_login_at
		FROM employees e
		JOIN companies c ON c.id = e.company_id
		JOIN roles rl ON rl.id = e.role_id
		LEFT JOIN warehouses w ON w.id = e.warehouse_id
		WHERE e.email = $1 AND e.deleted_at IS NULL
	`
	var (
		companyID int64
		roleID    int64
	)
	acc := &ActorAccount{ActorType: types.ActorEmployee}
	err := q.QueryRow(ctx, sqlQuery, email).Scan(
		&acc.ID,
		&companyID,
		&acc.CompanyName,
		&acc.CompanyIsActive,
		&roleID,
		&acc.RoleCode,
		&acc.RoleName,
		&acc.WarehouseID,
		&acc.WarehouseCode,
		&acc.WarehouseName,
		&acc.WarehouseIsActive,
		&acc.Email,
		&acc.PasswordHash,
		&acc.FirstName,
		&acc.LastName,
		&acc.FullName,
		&acc.DocumentType,
		&acc.Document,
		&acc.Phone,
		&acc.Address,
		&acc.PhotoURL,
		&acc.WorkModality,
		&acc.EmploymentStatus,
		&acc.Status,
		&acc.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	acc.CompanyID = &companyID
	acc.RoleID = &roleID
	empID := acc.ID
	acc.LinkedEmployeeID = &empID
	acc.IsActive = acc.Status == string(types.EmployeeActive) && acc.EmploymentStatus == string(types.EmploymentActive)
	return acc, nil
}

// FindEmployeeByID busca un empleado por su id.
func (r *AuthRepository) FindEmployeeByID(ctx context.Context, q db.DBExecutor, id int64) (*ActorAccount, error) {
	const sqlQuery = `
		SELECT
			e.id, e.company_id, c.name, c.is_active,
			e.role_id, rl.code, rl.name,
			e.warehouse_id, COALESCE(w.code, ''), COALESCE(w.name, ''), COALESCE(w.is_active, FALSE),
			e.email, e.password_hash, e.first_name, e.last_name, e.full_name,
			e.document_type, COALESCE(e.document, ''), COALESCE(e.phone, ''),
			COALESCE(e.address, ''), COALESCE(e.photo_url, ''),
			e.work_modality, e.employment_status, e.status, e.last_login_at
		FROM employees e
		JOIN companies c ON c.id = e.company_id
		JOIN roles rl ON rl.id = e.role_id
		LEFT JOIN warehouses w ON w.id = e.warehouse_id
		WHERE e.id = $1 AND e.deleted_at IS NULL
	`
	var (
		companyID int64
		roleID    int64
	)
	acc := &ActorAccount{ActorType: types.ActorEmployee}
	err := q.QueryRow(ctx, sqlQuery, id).Scan(
		&acc.ID,
		&companyID,
		&acc.CompanyName,
		&acc.CompanyIsActive,
		&roleID,
		&acc.RoleCode,
		&acc.RoleName,
		&acc.WarehouseID,
		&acc.WarehouseCode,
		&acc.WarehouseName,
		&acc.WarehouseIsActive,
		&acc.Email,
		&acc.PasswordHash,
		&acc.FirstName,
		&acc.LastName,
		&acc.FullName,
		&acc.DocumentType,
		&acc.Document,
		&acc.Phone,
		&acc.Address,
		&acc.PhotoURL,
		&acc.WorkModality,
		&acc.EmploymentStatus,
		&acc.Status,
		&acc.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	acc.CompanyID = &companyID
	acc.RoleID = &roleID
	empID := acc.ID
	acc.LinkedEmployeeID = &empID
	acc.IsActive = acc.Status == string(types.EmployeeActive) && acc.EmploymentStatus == string(types.EmploymentActive)
	return acc, nil
}
