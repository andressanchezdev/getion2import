package repositories

// auth_session_repo · sesiones: tokens de renovación y revocación
// conecta con: AuthRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en auth_repo.go)

import (
	"context"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
)

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

// FindActiveRefreshTokenByHash busca un token de renovación vigente (no revocado ni vencido) por su huella.
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

// RevokeRefreshTokenByID revoca un token de renovación por su id.
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

// RevokeRefreshTokenByHash revoca un token de renovación por su huella.
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

// RevokeAllActorSessions revoca todos los tokens de renovación de un actor, es decir, cierra todas sus sesiones.
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

// RevokeOtherActorSessions cierra todas las sesiones del actor menos la indicada (la que hace la petición).
// ojo: con exceptSessionID = 0 equivale a RevokeAllActorSessions, porque ningún id de sesión vale 0
func (r *AuthRepository) RevokeOtherActorSessions(ctx context.Context, q db.DBExecutor, actorType types.ActorType, actorID, exceptSessionID int64) error {
	var column string
	switch actorType {
	case types.ActorEmployee:
		column = "employee_id"
	case types.ActorAdmin:
		column = "admin_id"
	case types.ActorSuperadmin:
		column = "superadmin_id"
	default:
		return nil
	}
	sqlQuery := `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE ` + column + ` = $1 AND id <> $2 AND revoked_at IS NULL`
	_, err := q.Exec(ctx, sqlQuery, actorID, exceptSessionID)
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

// RevokeTokensByCompany revoca todos los tokens de todos los admins y empleados de una compañía dada.
func (r *AuthRepository) RevokeTokensByCompany(ctx context.Context, q db.DBExecutor, companyID int64) error {
	const sqlQuery = `
		UPDATE refresh_tokens
		SET revoked_at = CURRENT_TIMESTAMP
		WHERE revoked_at IS NULL
		  AND (
			admin_id IN (SELECT id FROM admins WHERE company_id = $1)
			OR employee_id IN (SELECT id FROM employees WHERE company_id = $1)
		  )
	`
	_, err := q.Exec(ctx, sqlQuery, companyID)
	return err
}

// RevokeTokensByWarehouse cierra las sesiones de los empleados asignados a una bodega.
func (r *AuthRepository) RevokeTokensByWarehouse(ctx context.Context, q db.DBExecutor, warehouseID int64) error {
	const sqlQuery = `
		UPDATE refresh_tokens
		SET revoked_at = CURRENT_TIMESTAMP
		WHERE revoked_at IS NULL
		  AND employee_id IN (SELECT id FROM employees WHERE warehouse_id = $1)
	`
	_, err := q.Exec(ctx, sqlQuery, warehouseID)
	return err
}

// IsActorAvailable confirma que el usuario, su compañía y su bodega sigan activos.
func (r *AuthRepository) IsActorAvailable(ctx context.Context, q db.DBExecutor, actorType types.ActorType, actorID int64) (bool, error) {
	account, err := r.FindActorByID(ctx, q, actorType, actorID)
	if err != nil {
		return false, err
	}
	if !account.IsActive || !account.CompanyIsActive {
		return false, nil
	}
	if actorType == types.ActorEmployee && account.WarehouseID != nil && !account.WarehouseIsActive {
		return false, nil
	}
	return true, nil
}

// ActorRef identifica a un administrador o empleado de una compañía para notificar el cierre de sus sesiones.
type ActorRef struct {
	ActorType types.ActorType
	ActorID   int64
}

// ListCompanyActors devuelve los administradores y empleados de una compañía.
func (r *AuthRepository) ListCompanyActors(ctx context.Context, q db.DBExecutor, companyID int64) ([]ActorRef, error) {
	const sqlQuery = `
		SELECT 'admin'::text, id FROM admins WHERE company_id = $1
		UNION ALL
		SELECT 'employee'::text, id FROM employees WHERE company_id = $1 AND deleted_at IS NULL
	`
	rows, err := q.Query(ctx, sqlQuery, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ActorRef
	for rows.Next() {
		var a ActorRef
		var kind string
		if err := rows.Scan(&kind, &a.ActorID); err != nil {
			return nil, err
		}
		a.ActorType = types.ActorType(kind)
		out = append(out, a)
	}
	return out, rows.Err()
}

// ListWarehouseEmployeeIDs devuelve los ids de los empleados asignados a una bodega.
func (r *AuthRepository) ListWarehouseEmployeeIDs(ctx context.Context, q db.DBExecutor, warehouseID int64) ([]int64, error) {
	const sqlQuery = `SELECT id FROM employees WHERE warehouse_id = $1 AND deleted_at IS NULL`
	rows, err := q.Query(ctx, sqlQuery, warehouseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}
