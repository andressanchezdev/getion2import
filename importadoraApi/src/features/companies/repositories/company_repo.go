package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/utils"

	"github.com/jackc/pgx/v5"
)

type CompanyEntity struct {
	ID                    int64
	CreatedBySuperadminID *int64
	Name                  string
	Email                 *string
	Phone                 *string
	Address               *string
	City                  *string
	LogoURL               *string
	IsActive              bool
	CreatedAt             time.Time
	UpdatedAt             time.Time
	DeletedAt             *time.Time
}

type CompanyRepository struct{}

func NewCompanyRepository() *CompanyRepository {
	return &CompanyRepository{}
}

func (r *CompanyRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*CompanyEntity, error) {
	const sql = `
		SELECT
			id, created_by_superadmin_id, name,
			email, phone, address, city, logo_url,
			is_active, created_at, updated_at, deleted_at
		FROM companies
		WHERE id = $1 AND deleted_at IS NULL
	`
	var c CompanyEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&c.ID, &c.CreatedBySuperadminID, &c.Name,
		&c.Email, &c.Phone, &c.Address, &c.City, &c.LogoURL,
		&c.IsActive, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CompanyRepository) FindByName(ctx context.Context, q db.DBExecutor, name string) (*CompanyEntity, error) {
	const sql = `
		SELECT
			id, created_by_superadmin_id, name,
			email, phone, address, city, logo_url,
			is_active, created_at, updated_at, deleted_at
		FROM companies
		WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND deleted_at IS NULL
	`
	var c CompanyEntity
	err := q.QueryRow(ctx, sql, name).Scan(
		&c.ID, &c.CreatedBySuperadminID, &c.Name,
		&c.Email, &c.Phone, &c.Address, &c.City, &c.LogoURL,
		&c.IsActive, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CompanyRepository) List(ctx context.Context, q db.DBExecutor, params utils.PageParams, companyIDFilter *int64) ([]CompanyEntity, int, error) {
	where := "WHERE deleted_at IS NULL"
	args := []any{}
	argIdx := 1

	if companyIDFilter != nil && *companyIDFilter > 0 {
		where += fmt.Sprintf(" AND id = $%d", argIdx)
		args = append(args, *companyIDFilter)
		argIdx++
	}

	countSQL := "SELECT COUNT(*) FROM companies " + where
	var total int
	if err := q.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listSQL := fmt.Sprintf(`
		SELECT
			id, created_by_superadmin_id, name,
			email, phone, address, city, logo_url,
			is_active, created_at, updated_at, deleted_at
		FROM companies
		%s
		ORDER BY id ASC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)

	args = append(args, params.PageSize, params.Offset)

	rows, err := q.Query(ctx, listSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]CompanyEntity, 0, params.PageSize)
	for rows.Next() {
		var c CompanyEntity
		if err := rows.Scan(
			&c.ID, &c.CreatedBySuperadminID, &c.Name,
			&c.Email, &c.Phone, &c.Address, &c.City, &c.LogoURL,
			&c.IsActive, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, c)
	}

	return items, total, nil
}

func (r *CompanyRepository) Search(ctx context.Context, q db.DBExecutor, query string, params utils.PageParams, companyIDFilter *int64) ([]CompanyEntity, int, error) {
	cleanQuery := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"

	where := "WHERE deleted_at IS NULL AND (LOWER(name) LIKE $1 OR LOWER(COALESCE(email, '')) LIKE $1 OR LOWER(COALESCE(phone, '')) LIKE $1 OR LOWER(COALESCE(city, '')) LIKE $1)"
	args := []any{cleanQuery}
	argIdx := 2

	if companyIDFilter != nil && *companyIDFilter > 0 {
		where += fmt.Sprintf(" AND id = $%d", argIdx)
		args = append(args, *companyIDFilter)
		argIdx++
	}

	countSQL := "SELECT COUNT(*) FROM companies " + where
	var total int
	if err := q.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	searchSQL := fmt.Sprintf(`
		SELECT
			id, created_by_superadmin_id, name,
			email, phone, address, city, logo_url,
			is_active, created_at, updated_at, deleted_at
		FROM companies
		%s
		ORDER BY name ASC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)

	args = append(args, params.PageSize, params.Offset)

	rows, err := q.Query(ctx, searchSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]CompanyEntity, 0, params.PageSize)
	for rows.Next() {
		var c CompanyEntity
		if err := rows.Scan(
			&c.ID, &c.CreatedBySuperadminID, &c.Name,
			&c.Email, &c.Phone, &c.Address, &c.City, &c.LogoURL,
			&c.IsActive, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, c)
	}

	return items, total, nil
}

func (r *CompanyRepository) Create(ctx context.Context, q db.DBExecutor, c *CompanyEntity) (*CompanyEntity, error) {
	const sql = `
		INSERT INTO companies (
			created_by_superadmin_id, name, email, phone, address, city, logo_url, is_active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at, deleted_at
	`
	err := q.QueryRow(
		ctx, sql,
		c.CreatedBySuperadminID, c.Name, c.Email, c.Phone, c.Address, c.City, c.LogoURL, c.IsActive,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CompanyRepository) Update(ctx context.Context, q db.DBExecutor, c *CompanyEntity) (*CompanyEntity, error) {
	const sql = `
		UPDATE companies
		SET
			name = $1,
			email = $2,
			phone = $3,
			address = $4,
			city = $5,
			logo_url = $6,
			is_active = $7,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $8 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := q.QueryRow(
		ctx, sql,
		c.Name, c.Email, c.Phone, c.Address, c.City, c.LogoURL, c.IsActive, c.ID,
	).Scan(&c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CompanyRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `
		UPDATE companies
		SET
			is_active = FALSE,
			deleted_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`
	cmd, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return utils.NotFound("COMPANY_NOT_FOUND", "La compañía no existe o ya fue eliminada.")
	}
	return nil
}

