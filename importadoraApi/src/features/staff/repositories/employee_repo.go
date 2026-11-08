package repositories

// employee_repo.go · acceso a la base de personal (administradores, empleados, roles y permisos): aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de personal (administradores, empleados, roles y permisos); los usan los services de personal (administradores, empleados, roles y permisos)

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/staff/dtos"

	"github.com/jackc/pgx/v5"
)

type EmployeeEntity struct {
	ID               int64
	CompanyID        int64
	RoleID           int64
	RoleName         string
	WarehouseID      *int64
	WarehouseName    *string
	Email            string
	PasswordHash     string
	FirstName        string
	LastName         string
	FullName         string
	DocumentType     types.DocumentType
	Document         *string
	Phone            *string
	Address          *string
	PhotoURL         *string
	WorkModality     types.WorkModality
	EmploymentStatus types.EmploymentStatus
	Status           types.EmployeeStatus
	LastLoginAt      *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        *time.Time
}

type EmployeeRepository struct{}

// NewEmployeeRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewEmployeeRepository() *EmployeeRepository {
	return &EmployeeRepository{}
}

// FindByID busca el empleado por su id (nil si no existe).
func (r *EmployeeRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*EmployeeEntity, error) {
	const sql = `
		SELECT
			e.id, e.company_id, e.role_id, COALESCE(r.name, ''),
			e.warehouse_id, w.name,
			e.email, e.password_hash, e.first_name, e.last_name, e.full_name,
			e.document_type, e.document, e.phone, e.address, e.photo_url,
			e.work_modality, e.employment_status, e.status, e.last_login_at,
			e.created_at, e.updated_at, e.deleted_at
		FROM employees e
		LEFT JOIN roles r ON r.id = e.role_id
		LEFT JOIN warehouses w ON w.id = e.warehouse_id
		WHERE e.id = $1 AND e.deleted_at IS NULL
	`
	var e EmployeeEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&e.ID, &e.CompanyID, &e.RoleID, &e.RoleName,
		&e.WarehouseID, &e.WarehouseName,
		&e.Email, &e.PasswordHash, &e.FirstName, &e.LastName, &e.FullName,
		&e.DocumentType, &e.Document, &e.Phone, &e.Address, &e.PhotoURL,
		&e.WorkModality, &e.EmploymentStatus, &e.Status, &e.LastLoginAt,
		&e.CreatedAt, &e.UpdatedAt, &e.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &e, nil
}

// FindByEmail busca el empleado por su correo (nil si no existe).
func (r *EmployeeRepository) FindByEmail(ctx context.Context, q db.DBExecutor, email string) (*EmployeeEntity, error) {
	const sql = `
		SELECT
			e.id, e.company_id, e.role_id, COALESCE(r.name, ''),
			e.warehouse_id, w.name,
			e.email, e.password_hash, e.first_name, e.last_name, e.full_name,
			e.document_type, e.document, e.phone, e.address, e.photo_url,
			e.work_modality, e.employment_status, e.status, e.last_login_at,
			e.created_at, e.updated_at, e.deleted_at
		FROM employees e
		LEFT JOIN roles r ON r.id = e.role_id
		LEFT JOIN warehouses w ON w.id = e.warehouse_id
		WHERE LOWER(e.email) = LOWER($1) AND e.deleted_at IS NULL
	`
	var e EmployeeEntity
	err := q.QueryRow(ctx, sql, email).Scan(
		&e.ID, &e.CompanyID, &e.RoleID, &e.RoleName,
		&e.WarehouseID, &e.WarehouseName,
		&e.Email, &e.PasswordHash, &e.FirstName, &e.LastName, &e.FullName,
		&e.DocumentType, &e.Document, &e.Phone, &e.Address, &e.PhotoURL,
		&e.WorkModality, &e.EmploymentStatus, &e.Status, &e.LastLoginAt,
		&e.CreatedAt, &e.UpdatedAt, &e.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &e, nil
}

// List lista los empleados según los filtros, con su total para paginar.
// List lista con búsqueda exacta; si el texto buscado no encuentra nada, reintenta tolerando errores de ortografía.
func (r *EmployeeRepository) List(ctx context.Context, q db.DBExecutor, f dtos.EmployeeFilterQuery) ([]EmployeeEntity, int, error) {
	items, total, err := r.list(ctx, q, f, false)
	if err == nil && total == 0 && strings.TrimSpace(f.Search) != "" {
		return r.list(ctx, q, f, true)
	}
	return items, total, err
}

func (r *EmployeeRepository) list(ctx context.Context, q db.DBExecutor, f dtos.EmployeeFilterQuery, fuzzy bool) ([]EmployeeEntity, int, error) {
	where := []string{"e.deleted_at IS NULL"}
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("e.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.RoleID != nil {
		where = append(where, fmt.Sprintf("e.role_id = $%d", argIdx))
		args = append(args, *f.RoleID)
		argIdx++
	}

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("e.warehouse_id = $%d", argIdx))
		args = append(args, *f.WarehouseID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("e.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	if f.Search != "" {
		where = append(where, fmt.Sprintf("(e.full_name ILIKE $%d OR e.email::text ILIKE $%d OR e.document ILIKE $%d)%s", argIdx, argIdx, argIdx, utils.FuzzyOr(fuzzy, argIdx, "e.full_name")))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(where, " AND ")

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM employees e %s", whereClause)
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
			e.id, e.company_id, e.role_id, COALESCE(r.name, ''),
			e.warehouse_id, w.name,
			e.email, e.password_hash, e.first_name, e.last_name, e.full_name,
			e.document_type, e.document, e.phone, e.address, e.photo_url,
			e.work_modality, e.employment_status, e.status, e.last_login_at,
			e.created_at, e.updated_at, e.deleted_at
		FROM employees e
		LEFT JOIN roles r ON r.id = e.role_id
		LEFT JOIN warehouses w ON w.id = e.warehouse_id
		%s
		ORDER BY e.id ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	employees := make([]EmployeeEntity, 0)
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
			return nil, 0, err
		}
		employees = append(employees, e)
	}

	return employees, total, rows.Err()
}

// Create inserta el empleado y devuelve el registro guardado.
func (r *EmployeeRepository) Create(ctx context.Context, q db.DBExecutor, e *EmployeeEntity) (*EmployeeEntity, error) {
	const insertEmpSQL = `
		INSERT INTO employees (
			company_id, role_id, warehouse_id, email, password_hash,
			first_name, last_name, document_type, document, phone,
			address, photo_url, work_modality, employment_status, status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
		)
		RETURNING id, full_name, created_at, updated_at
	`
	err := q.QueryRow(ctx, insertEmpSQL,
		e.CompanyID, e.RoleID, e.WarehouseID, e.Email, e.PasswordHash,
		e.FirstName, e.LastName, e.DocumentType, e.Document, e.Phone,
		e.Address, e.PhotoURL, e.WorkModality, e.EmploymentStatus, e.Status,
	).Scan(&e.ID, &e.FullName, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Insertar registro en employee_login_attempts
	const insertAttemptsSQL = `
		INSERT INTO employee_login_attempts (employee_id, email, failed_login_count)
		VALUES ($1, $2, 0)
		ON CONFLICT (employee_id) DO NOTHING
	`
	_, _ = q.Exec(ctx, insertAttemptsSQL, e.ID, e.Email)

	return e, nil
}

// Update actualiza los datos de el empleado.
func (r *EmployeeRepository) Update(ctx context.Context, q db.DBExecutor, e *EmployeeEntity) (*EmployeeEntity, error) {
	const sql = `
		UPDATE employees SET
			role_id = $1,
			warehouse_id = $2,
			first_name = $3,
			last_name = $4,
			document_type = $5,
			document = $6,
			phone = $7,
			address = $8,
			photo_url = $9,
			work_modality = $10,
			employment_status = $11,
			status = $12,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $13 AND deleted_at IS NULL
		RETURNING full_name, updated_at
	`
	err := q.QueryRow(ctx, sql,
		e.RoleID, e.WarehouseID, e.FirstName, e.LastName,
		e.DocumentType, e.Document, e.Phone, e.Address, e.PhotoURL,
		e.WorkModality, e.EmploymentStatus, e.Status, e.ID,
	).Scan(&e.FullName, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

// SoftDelete marca el empleado como eliminado (borrado lógico: no se pierde el registro).
func (r *EmployeeRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `
		UPDATE employees SET
			deleted_at = CURRENT_TIMESTAMP,
			status = 'inactive',
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("empleado no encontrado o ya eliminado")
	}
	return nil
}

