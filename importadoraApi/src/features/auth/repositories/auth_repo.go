package repositories

// auth_repo.go · acceso a la base de autenticación y sesiones: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de autenticación y sesiones; los usan los services de autenticación y sesiones

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"

	"github.com/jackc/pgx/v5"
)

type PermissionRecord = middlewares.PermissionRecord

// ActorAccount contiene los datos completos de autenticación y contexto de cualquiera de los 3 actores.
type ActorAccount struct {
	ID               int64
	ActorType        types.ActorType
	Email            string
	Username         string
	PasswordHash     string
	FirstName        string
	LastName         string
	FullName         string
	Phone            string
	DocumentType     string
	Document         string
	Address          string
	PhotoURL         string
	AccessLevel      string
	LinkedEmployeeID *int64
	CompanyID        *int64
	CompanyName      string
	CompanyIsActive  bool
	WarehouseID      *int64
	WarehouseCode    string
	WarehouseName    string
	RoleID           *int64
	RoleCode         string
	RoleName         string
	WorkModality     string
	EmploymentStatus string
	Status           string
	IsActive         bool
	LastLoginAt      *time.Time
}

type AuthRepository struct{}

// NewAuthRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewAuthRepository() *AuthRepository {
	return &AuthRepository{}
}

// FindSuperadminByEmail busca un superadministrador por su correo.
func (r *AuthRepository) FindSuperadminByEmail(ctx context.Context, q db.DBExecutor, email string) (*ActorAccount, error) {
	const sqlQuery = `
		SELECT
			id, username, email, password_hash, first_name, last_name, full_name,
			COALESCE(phone, ''), access_level, is_active, last_login_at
		FROM superadmins
		WHERE email = $1
	`
	acc := &ActorAccount{ActorType: types.ActorSuperadmin, CompanyIsActive: true}
	err := q.QueryRow(ctx, sqlQuery, email).Scan(
		&acc.ID,
		&acc.Username,
		&acc.Email,
		&acc.PasswordHash,
		&acc.FirstName,
		&acc.LastName,
		&acc.FullName,
		&acc.Phone,
		&acc.AccessLevel,
		&acc.IsActive,
		&acc.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	if acc.IsActive {
		acc.Status = "active"
	} else {
		acc.Status = "inactive"
	}
	return acc, nil
}

// FindSuperadminByID busca un superadministrador por su id.
func (r *AuthRepository) FindSuperadminByID(ctx context.Context, q db.DBExecutor, id int64) (*ActorAccount, error) {
	const sqlQuery = `
		SELECT
			id, username, email, password_hash, first_name, last_name, full_name,
			COALESCE(phone, ''), access_level, is_active, last_login_at
		FROM superadmins
		WHERE id = $1
	`
	acc := &ActorAccount{ActorType: types.ActorSuperadmin, CompanyIsActive: true}
	err := q.QueryRow(ctx, sqlQuery, id).Scan(
		&acc.ID,
		&acc.Username,
		&acc.Email,
		&acc.PasswordHash,
		&acc.FirstName,
		&acc.LastName,
		&acc.FullName,
		&acc.Phone,
		&acc.AccessLevel,
		&acc.IsActive,
		&acc.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	if acc.IsActive {
		acc.Status = "active"
	} else {
		acc.Status = "inactive"
	}
	return acc, nil
}

// FindAdminByEmail busca un administrador por su correo.
func (r *AuthRepository) FindAdminByEmail(ctx context.Context, q db.DBExecutor, email string) (*ActorAccount, error) {
	const sqlQuery = `
		SELECT
			a.id, a.company_id, c.name, c.is_active, a.employee_id,
			a.email, a.password_hash, a.first_name, a.last_name, a.full_name,
			a.document_type, COALESCE(a.document, ''), COALESCE(a.phone, ''),
			a.is_active, a.last_login_at
		FROM admins a
		JOIN companies c ON c.id = a.company_id
		WHERE a.email = $1
	`
	var companyID int64
	acc := &ActorAccount{ActorType: types.ActorAdmin}
	err := q.QueryRow(ctx, sqlQuery, email).Scan(
		&acc.ID,
		&companyID,
		&acc.CompanyName,
		&acc.CompanyIsActive,
		&acc.LinkedEmployeeID,
		&acc.Email,
		&acc.PasswordHash,
		&acc.FirstName,
		&acc.LastName,
		&acc.FullName,
		&acc.DocumentType,
		&acc.Document,
		&acc.Phone,
		&acc.IsActive,
		&acc.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	acc.CompanyID = &companyID
	if acc.IsActive {
		acc.Status = "active"
	} else {
		acc.Status = "inactive"
	}
	return acc, nil
}

// FindAdminByID busca un administrador por su id.
func (r *AuthRepository) FindAdminByID(ctx context.Context, q db.DBExecutor, id int64) (*ActorAccount, error) {
	const sqlQuery = `
		SELECT
			a.id, a.company_id, c.name, c.is_active, a.employee_id,
			a.email, a.password_hash, a.first_name, a.last_name, a.full_name,
			a.document_type, COALESCE(a.document, ''), COALESCE(a.phone, ''),
			a.is_active, a.last_login_at
		FROM admins a
		JOIN companies c ON c.id = a.company_id
		WHERE a.id = $1
	`
	var companyID int64
	acc := &ActorAccount{ActorType: types.ActorAdmin}
	err := q.QueryRow(ctx, sqlQuery, id).Scan(
		&acc.ID,
		&companyID,
		&acc.CompanyName,
		&acc.CompanyIsActive,
		&acc.LinkedEmployeeID,
		&acc.Email,
		&acc.PasswordHash,
		&acc.FirstName,
		&acc.LastName,
		&acc.FullName,
		&acc.DocumentType,
		&acc.Document,
		&acc.Phone,
		&acc.IsActive,
		&acc.LastLoginAt,
	)
	if err != nil {
		return nil, err
	}
	acc.CompanyID = &companyID
	if acc.IsActive {
		acc.Status = "active"
	} else {
		acc.Status = "inactive"
	}
	return acc, nil
}

// ResolveActorByEmail busca la cuenta en el actorType indicado, o en orden jerárquico si actorType está vacío.
func (r *AuthRepository) ResolveActorByEmail(ctx context.Context, q db.DBExecutor, email string, actorType types.ActorType) (*ActorAccount, error) {
	switch actorType {
	case types.ActorSuperadmin:
		return r.FindSuperadminByEmail(ctx, q, email)
	case types.ActorAdmin:
		return r.FindAdminByEmail(ctx, q, email)
	case types.ActorEmployee:
		return r.FindEmployeeByEmail(ctx, q, email)
	default:
		if acc, err := r.FindSuperadminByEmail(ctx, q, email); err == nil {
			return acc, nil
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if acc, err := r.FindAdminByEmail(ctx, q, email); err == nil {
			return acc, nil
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		return r.FindEmployeeByEmail(ctx, q, email)
	}
}

// FindActorByID busca a la persona por su id según su tipo de actor (superadmin, administrador o empleado).
func (r *AuthRepository) FindActorByID(ctx context.Context, q db.DBExecutor, actorType types.ActorType, actorID int64) (*ActorAccount, error) {
	switch actorType {
	case types.ActorSuperadmin:
		return r.FindSuperadminByID(ctx, q, actorID)
	case types.ActorAdmin:
		return r.FindAdminByID(ctx, q, actorID)
	case types.ActorEmployee:
		return r.FindEmployeeByID(ctx, q, actorID)
	default:
		return nil, pgx.ErrNoRows
	}
}

// ResolveActorDisplayName obtiene el nombre legible del actor autenticado (superadmin, admin o empleado) usando FindActorByID.
func (r *AuthRepository) ResolveActorDisplayName(ctx context.Context, q db.DBExecutor, actor *middlewares.ActorContext) string {
	if actor == nil {
		return "Desconocido"
	}
	if actor.ActorType == types.ActorSuperadmin {
		return "Super Administrador"
	}
	if acc, err := r.FindActorByID(ctx, q, actor.ActorType, actor.ActorID); err == nil && acc != nil {
		if acc.FullName != "" {
			return acc.FullName
		}
		if acc.FirstName != "" || acc.LastName != "" {
			return acc.FirstName + " " + acc.LastName
		}
	}
	if actor.Email != "" {
		return actor.Email
	}
	return "Usuario"
}

// TouchLastLogin guarda la fecha y hora del último ingreso del actor.
func (r *AuthRepository) TouchLastLogin(ctx context.Context, q db.DBExecutor, actorType types.ActorType, actorID int64) error {
	var sqlQuery string
	switch actorType {
	case types.ActorSuperadmin:
		sqlQuery = `UPDATE superadmins SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`
	case types.ActorAdmin:
		sqlQuery = `UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`
	case types.ActorEmployee:
		sqlQuery = `UPDATE employees SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`
	default:
		return nil
	}
	_, err := q.Exec(ctx, sqlQuery, actorID)
	return err
}

// LoadPermissionsForActor carga los permisos habilitados en employee_permissions (o el catálogo completo para admin/superadmin).
func (r *AuthRepository) LoadPermissionsForActor(ctx context.Context, q db.DBExecutor, actorType types.ActorType, actorID int64) ([]PermissionRecord, error) {
	var (
		rows pgx.Rows
		err  error
	)

	if actorType == types.ActorEmployee {
		const empSQL = `
			SELECT p.id, p.module, p.action, COALESCE(p.description, '')
			FROM employee_permissions ep
			JOIN permissions p ON p.id = ep.permission_id
			WHERE ep.employee_id = $1
			ORDER BY p.module, p.action
		`
		rows, err = q.Query(ctx, empSQL, actorID)
	} else {
		const allSQL = `
			SELECT id, module, action, COALESCE(description, '')
			FROM permissions
			ORDER BY module, action
		`
		rows, err = q.Query(ctx, allSQL)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]PermissionRecord, 0)
	for rows.Next() {
		var p PermissionRecord
		if err := rows.Scan(&p.ID, &p.Module, &p.Action, &p.Description); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}
