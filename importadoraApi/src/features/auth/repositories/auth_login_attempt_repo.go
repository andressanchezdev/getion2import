package repositories

// auth_login_attempt_repo · intentos fallidos de ingreso de empleados y bloqueo
// conecta con: AuthRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en auth_repo.go)

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

// LoginAttemptRecord fila de employee_login_attempts.
type LoginAttemptRecord struct {
	ID               int64
	EmployeeID       *int64
	Email            string
	FailedLoginCount int
	BlockedUntil     *time.Time
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
