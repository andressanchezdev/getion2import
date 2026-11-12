package repositories

// role_repo.go · acceso a la base de personal (administradores, empleados, roles y permisos): aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de personal (administradores, empleados, roles y permisos); los usan los services de personal (administradores, empleados, roles y permisos)

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

type RoleEntity struct {
	ID          int64
	CompanyID   int64
	Code        string
	Name        string
	Description *string
	IsActive    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type RoleRepository struct{}

// NewRoleRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewRoleRepository() *RoleRepository {
	return &RoleRepository{}
}

// FindByID busca el rol por su id (nil si no existe).
func (r *RoleRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*RoleEntity, error) {
	const sql = `
		SELECT id, company_id, code, name, description, is_active, created_at, updated_at
		FROM roles
		WHERE id = $1
	`
	var role RoleEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&role.ID, &role.CompanyID, &role.Code, &role.Name, &role.Description, &role.IsActive, &role.CreatedAt, &role.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &role, nil
}

// FindByCompanyAndCode busca el rol por compañía y código (nil si no existe).
func (r *RoleRepository) FindByCompanyAndCode(ctx context.Context, q db.DBExecutor, companyID int64, code string) (*RoleEntity, error) {
	const sql = `
		SELECT id, company_id, code, name, description, is_active, created_at, updated_at
		FROM roles
		WHERE company_id = $1 AND LOWER(code) = LOWER($2)
	`
	var role RoleEntity
	err := q.QueryRow(ctx, sql, companyID, code).Scan(
		&role.ID, &role.CompanyID, &role.Code, &role.Name, &role.Description, &role.IsActive, &role.CreatedAt, &role.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &role, nil
}

// ListByCompany lista los roles de una compañía.
func (r *RoleRepository) ListByCompany(ctx context.Context, q db.DBExecutor, companyID int64, activeOnly bool) ([]RoleEntity, error) {
	sql := `
		SELECT id, company_id, code, name, description, is_active, created_at, updated_at
		FROM roles
		WHERE company_id = $1
	`
	if activeOnly {
		sql += " AND is_active = TRUE"
	}
	sql += " ORDER BY id ASC"

	rows, err := q.Query(ctx, sql, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	roles := make([]RoleEntity, 0)
	for rows.Next() {
		var role RoleEntity
		if err := rows.Scan(
			&role.ID, &role.CompanyID, &role.Code, &role.Name, &role.Description, &role.IsActive, &role.CreatedAt, &role.UpdatedAt,
		); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}

	return roles, rows.Err()
}

// Create inserta el rol y devuelve el registro guardado.
func (r *RoleRepository) Create(ctx context.Context, q db.DBExecutor, role *RoleEntity) (*RoleEntity, error) {
	const sql = `
		INSERT INTO roles (company_id, code, name, description, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		role.CompanyID, role.Code, role.Name, role.Description, role.IsActive,
	).Scan(&role.ID, &role.CreatedAt, &role.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return role, nil
}

// Update actualiza los datos de el rol.
func (r *RoleRepository) Update(ctx context.Context, q db.DBExecutor, role *RoleEntity) (*RoleEntity, error) {
	const sql = `
		UPDATE roles SET
			name = $1,
			description = $2,
			is_active = $3,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING updated_at
	`
	err := q.QueryRow(ctx, sql, role.Name, role.Description, role.IsActive, role.ID).Scan(&role.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("rol no encontrado")
		}
		return nil, err
	}
	return role, nil
}

// SoftDelete marca el rol como eliminado (borrado lógico: no se pierde el registro).
func (r *RoleRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `UPDATE roles SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("rol no encontrado")
	}
	return nil
}

