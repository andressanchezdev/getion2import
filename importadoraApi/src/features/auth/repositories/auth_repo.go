package repositories

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


// LoginAttemptRecord fila de employee_login_attempts.
type LoginAttemptRecord struct {
	ID               int64
	EmployeeID       *int64
	Email            string
	FailedLoginCount int
	BlockedUntil     *time.Time
}

// RefreshTokenRecord fila de refresh_tokens.
type RefreshTokenRecord struct {
	ID           int64
	EmployeeID   *int64
	AdminID      *int64
	SuperadminID *int64
	TokenHash    string
	Device       string
	IPAddress    string
	ExpiresAt    time.Time
	RevokedAt    *time.Time
}

type AuthRepository struct{}

func NewAuthRepository() *AuthRepository {
	return &AuthRepository{}
}

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

func (r *AuthRepository) FindEmployeeByEmail(ctx context.Context, q db.DBExecutor, email string) (*ActorAccount, error) {
	const sqlQuery = `
		SELECT
			e.id, e.company_id, c.name, c.is_active,
			e.role_id, rl.code, rl.name,
			e.warehouse_id, COALESCE(w.code, ''), COALESCE(w.name, ''),
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

func (r *AuthRepository) FindEmployeeByID(ctx context.Context, q db.DBExecutor, id int64) (*ActorAccount, error) {
	const sqlQuery = `
		SELECT
			e.id, e.company_id, c.name, c.is_active,
			e.role_id, rl.code, rl.name,
			e.warehouse_id, COALESCE(w.code, ''), COALESCE(w.name, ''),
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

// GetEmployeeLoginAttempt obtiene el control de intentos fallidos del empleado en employee_login_attempts.
func (r *AuthRepository) GetEmployeeLoginAttempt(ctx context.Context, q db.DBExecutor, employeeID int64, email string) (*LoginAttemptRecord, error) {
	const sqlQuery = `
		SELECT id, employee_id, email, failed_login_count, blocked_until
		FROM employee_login_attempts
		WHERE employee_id = $1 OR email = $2
		LIMIT 1
	`
	rec := &LoginAttemptRecord{}
	err := q.QueryRow(ctx, sqlQuery, employeeID, email).Scan(
		&rec.ID,
		&rec.EmployeeID,
		&rec.Email,
		&rec.FailedLoginCount,
		&rec.BlockedUntil,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return rec, nil
}

// RecordFailedEmployeeLogin incrementa failed_login_count y bloquea temporalmente si alcanza maxAttempts.
func (r *AuthRepository) RecordFailedEmployeeLogin(
	ctx context.Context,
	q db.DBExecutor,
	employeeID int64,
	email string,
	ip string,
	maxAttempts int,
	blockDuration time.Duration,
) (int, *time.Time, error) {
	now := time.Now().UTC()
	var (
		newCount     int
		blockedUntil *time.Time
	)

	existing, err := r.GetEmployeeLoginAttempt(ctx, q, employeeID, email)
	if err != nil {
		return 0, nil, err
	}

	if existing == nil {
		newCount = 1
		if newCount >= maxAttempts {
			bt := now.Add(blockDuration)
			blockedUntil = &bt
		}
		const insertSQL = `
			INSERT INTO employee_login_attempts (employee_id, email, failed_login_count, blocked_until, last_attempt_at, last_ip)
			VALUES ($1, $2, $3, $4, $5, $6)
		`
		_, err = q.Exec(ctx, insertSQL, employeeID, email, newCount, blockedUntil, now, ip)
		return newCount, blockedUntil, err
	}

	newCount = existing.FailedLoginCount + 1
	if newCount >= maxAttempts {
		bt := now.Add(blockDuration)
		blockedUntil = &bt
	}
	const updateSQL = `
		UPDATE employee_login_attempts
		SET employee_id = $1,
		    email = $2,
		    failed_login_count = $3,
		    blocked_until = $4,
		    last_attempt_at = $5,
		    last_ip = $6
		WHERE id = $7
	`
	_, err = q.Exec(ctx, updateSQL, employeeID, email, newCount, blockedUntil, now, ip, existing.ID)
	return newCount, blockedUntil, err
}

// ResetEmployeeLoginAttempts limpia el contador de fallos y actualiza last_login_at tras login exitoso.
func (r *AuthRepository) ResetEmployeeLoginAttempts(ctx context.Context, q db.DBExecutor, employeeID int64, email, ip string) error {
	now := time.Now().UTC()
	const upsertSQL = `
		INSERT INTO employee_login_attempts (employee_id, email, failed_login_count, blocked_until, last_attempt_at, last_ip)
		VALUES ($1, $2, 0, NULL, $3, $4)
		ON CONFLICT (employee_id) DO UPDATE
		SET failed_login_count = 0,
		    blocked_until = NULL,
		    last_attempt_at = EXCLUDED.last_attempt_at,
		    last_ip = EXCLUDED.last_ip
	`
	_, err := q.Exec(ctx, upsertSQL, employeeID, email, now, ip)
	return err
}

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

// CreateRefreshToken registra una nueva sesión activa respetando CHECK (num_nonnulls(...) = 1).
func (r *AuthRepository) CreateRefreshToken(
	ctx context.Context,
	q db.DBExecutor,
	actorType types.ActorType,
	actorID int64,
	tokenHash string,
	device string,
	ip string,
	expiresAt time.Time,
) (int64, error) {
	var (
		empID *int64
		admID *int64
		supID *int64
	)
	switch actorType {
	case types.ActorEmployee:
		empID = &actorID
	case types.ActorAdmin:
		admID = &actorID
	case types.ActorSuperadmin:
		supID = &actorID
	}

	var devPtr *string
	if device != "" {
		devPtr = &device
	}
	var ipPtr *string
	if ip != "" {
		ipPtr = &ip
	}

	const insertSQL = `
		INSERT INTO refresh_tokens (
			employee_id, admin_id, superadmin_id, token_hash, device, ip_address, expires_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	var id int64
	err := q.QueryRow(ctx, insertSQL, empID, admID, supID, tokenHash, devPtr, ipPtr, expiresAt).Scan(&id)
	return id, err
}

func (r *AuthRepository) FindActiveRefreshTokenByHash(ctx context.Context, q db.DBExecutor, tokenHash string) (*RefreshTokenRecord, error) {
	const sqlQuery = `
		SELECT
			id, employee_id, admin_id, superadmin_id, token_hash,
			COALESCE(device, ''), COALESCE(ip_address, ''), expires_at, revoked_at
		FROM refresh_tokens
		WHERE token_hash = $1
		  AND revoked_at IS NULL
		  AND expires_at > CURRENT_TIMESTAMP
	`
	rec := &RefreshTokenRecord{}
	err := q.QueryRow(ctx, sqlQuery, tokenHash).Scan(
		&rec.ID,
		&rec.EmployeeID,
		&rec.AdminID,
		&rec.SuperadminID,
		&rec.TokenHash,
		&rec.Device,
		&rec.IPAddress,
		&rec.ExpiresAt,
		&rec.RevokedAt,
	)
	if err != nil {
		return nil, err
	}
	return rec, nil
}

func (r *AuthRepository) RevokeRefreshTokenByID(ctx context.Context, q db.DBExecutor, id int64) error {
	const sqlQuery = `
		UPDATE refresh_tokens
		SET revoked_at = CURRENT_TIMESTAMP,
		    last_used_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND revoked_at IS NULL
	`
	_, err := q.Exec(ctx, sqlQuery, id)
	return err
}

func (r *AuthRepository) RevokeRefreshTokenByHash(ctx context.Context, q db.DBExecutor, tokenHash string) error {
	const sqlQuery = `
		UPDATE refresh_tokens
		SET revoked_at = CURRENT_TIMESTAMP,
		    last_used_at = CURRENT_TIMESTAMP
		WHERE token_hash = $1 AND revoked_at IS NULL
	`
	_, err := q.Exec(ctx, sqlQuery, tokenHash)
	return err
}

func (r *AuthRepository) RevokeAllActorSessions(ctx context.Context, q db.DBExecutor, actorType types.ActorType, actorID int64) error {
	var sqlQuery string
	switch actorType {
	case types.ActorEmployee:
		sqlQuery = `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE employee_id = $1 AND revoked_at IS NULL`
	case types.ActorAdmin:
		sqlQuery = `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE admin_id = $1 AND revoked_at IS NULL`
	case types.ActorSuperadmin:
		sqlQuery = `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE superadmin_id = $1 AND revoked_at IS NULL`
	default:
		return nil
	}
	_, err := q.Exec(ctx, sqlQuery, actorID)
	return err
}

// IsSessionActive valida que el registro de sesión en refresh_tokens siga vigente y no revocado.
func (r *AuthRepository) IsSessionActive(ctx context.Context, q db.DBExecutor, sessionID int64) (bool, error) {
	const sqlQuery = `
		SELECT EXISTS (
			SELECT 1
			FROM refresh_tokens
			WHERE id = $1
			  AND revoked_at IS NULL
			  AND expires_at > CURRENT_TIMESTAMP
		)
	`
	var active bool
	err := q.QueryRow(ctx, sqlQuery, sessionID).Scan(&active)
	return active, err
}
