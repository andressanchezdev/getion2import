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
