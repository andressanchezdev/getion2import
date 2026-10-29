package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/staff/dtos"

	"github.com/jackc/pgx/v5"
)

type AdminEntity struct {
	ID                   int64
	CompanyID            int64
	CompanyName          string
	EmployeeID           *int64
	CreatedBySuperadminID *int64
	Email                string
	PasswordHash         string
	FirstName            string
	LastName             string
	FullName             string
	DocumentType         types.DocumentType
	Document             *string
	Phone                *string
	IsActive             bool
	LastLoginAt          *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type AdminRepository struct{}

func NewAdminRepository() *AdminRepository {
	return &AdminRepository{}
}

func (r *AdminRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*AdminEntity, error) {
	const sql = `
		SELECT
			a.id, a.company_id, COALESCE(c.name, ''), a.employee_id, a.created_by_superadmin_id,
			a.email, a.password_hash, a.first_name, a.last_name, a.full_name,
			a.document_type, a.document, a.phone, a.is_active, a.last_login_at,
			a.created_at, a.updated_at
		FROM admins a
		LEFT JOIN companies c ON c.id = a.company_id
		WHERE a.id = $1
	`
	var a AdminEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&a.ID, &a.CompanyID, &a.CompanyName, &a.EmployeeID, &a.CreatedBySuperadminID,
		&a.Email, &a.PasswordHash, &a.FirstName, &a.LastName, &a.FullName,
		&a.DocumentType, &a.Document, &a.Phone, &a.IsActive, &a.LastLoginAt,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *AdminRepository) FindByEmail(ctx context.Context, q db.DBExecutor, email string) (*AdminEntity, error) {
	const sql = `
		SELECT
			a.id, a.company_id, COALESCE(c.name, ''), a.employee_id, a.created_by_superadmin_id,
			a.email, a.password_hash, a.first_name, a.last_name, a.full_name,
			a.document_type, a.document, a.phone, a.is_active, a.last_login_at,
			a.created_at, a.updated_at
		FROM admins a
		LEFT JOIN companies c ON c.id = a.company_id
		WHERE LOWER(a.email) = LOWER($1)
	`
	var a AdminEntity
	err := q.QueryRow(ctx, sql, email).Scan(
		&a.ID, &a.CompanyID, &a.CompanyName, &a.EmployeeID, &a.CreatedBySuperadminID,
		&a.Email, &a.PasswordHash, &a.FirstName, &a.LastName, &a.FullName,
		&a.DocumentType, &a.Document, &a.Phone, &a.IsActive, &a.LastLoginAt,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *AdminRepository) List(ctx context.Context, q db.DBExecutor, f dtos.AdminFilterQuery) ([]AdminEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("a.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.IsActive != nil {
		where = append(where, fmt.Sprintf("a.is_active = $%d", argIdx))
		args = append(args, *f.IsActive)
		argIdx++
	}

	if f.Search != "" {
		where = append(where, fmt.Sprintf("(a.first_name ILIKE $%d OR a.last_name ILIKE $%d OR a.email ILIKE $%d OR a.document ILIKE $%d)", argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM admins a %s", whereClause)
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
			a.id, a.company_id, COALESCE(c.name, ''), a.employee_id, a.created_by_superadmin_id,
			a.email, a.password_hash, a.first_name, a.last_name, a.full_name,
			a.document_type, a.document, a.phone, a.is_active, a.last_login_at,
			a.created_at, a.updated_at
		FROM admins a
		LEFT JOIN companies c ON c.id = a.company_id
		%s
		ORDER BY a.id ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	admins := make([]AdminEntity, 0)
	for rows.Next() {
		var a AdminEntity
		if err := rows.Scan(
			&a.ID, &a.CompanyID, &a.CompanyName, &a.EmployeeID, &a.CreatedBySuperadminID,
			&a.Email, &a.PasswordHash, &a.FirstName, &a.LastName, &a.FullName,
			&a.DocumentType, &a.Document, &a.Phone, &a.IsActive, &a.LastLoginAt,
			&a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		admins = append(admins, a)
	}

	return admins, total, rows.Err()
}

func (r *AdminRepository) Create(ctx context.Context, q db.DBExecutor, a *AdminEntity) (*AdminEntity, error) {
	const sql = `
		INSERT INTO admins (
			company_id, employee_id, created_by_superadmin_id, email, password_hash,
			first_name, last_name, document_type, document, phone, is_active
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING id, full_name, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		a.CompanyID, a.EmployeeID, a.CreatedBySuperadminID, a.Email, a.PasswordHash,
		a.FirstName, a.LastName, a.DocumentType, a.Document, a.Phone, a.IsActive,
	).Scan(&a.ID, &a.FullName, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *AdminRepository) Update(ctx context.Context, q db.DBExecutor, a *AdminEntity) (*AdminEntity, error) {
	const sql = `
		UPDATE admins SET
			first_name = $1,
			last_name = $2,
			document_type = $3,
			document = $4,
			phone = $5,
			is_active = $6,
			password_hash = $7,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
		RETURNING full_name, updated_at
	`
	err := q.QueryRow(ctx, sql,
		a.FirstName, a.LastName, a.DocumentType, a.Document, a.Phone, a.IsActive, a.PasswordHash, a.ID,
	).Scan(&a.FullName, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *AdminRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `UPDATE admins SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("admin no encontrado")
	}
	return nil
}

