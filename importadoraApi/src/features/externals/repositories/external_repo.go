package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/externals/dtos"

	"github.com/jackc/pgx/v5"
)

type ExternalEntity struct {
	ID           int64
	CompanyID    int64
	Kind         types.ExternalKind
	Category     *string
	DocumentType types.DocumentType
	Document     *string
	Name         string
	ContactName  *string
	ContactPhone *string
	ContactEmail *string
	Phone        *string
	Email        *string
	Address      *string
	City         *string
	TermsDays    int16
	CreditLimit  float64
	Coverage     *string
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ExternalRepository struct{}

func NewExternalRepository() *ExternalRepository {
	return &ExternalRepository{}
}

func (r *ExternalRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*ExternalEntity, error) {
	const sql = `
		SELECT
			id, company_id, kind, category, document_type, document,
			name, contact_name, contact_phone, contact_email,
			phone, email, address, city,
			terms_days, credit_limit, coverage, is_active,
			created_at, updated_at
		FROM externals
		WHERE id = $1
	`
	var e ExternalEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&e.ID, &e.CompanyID, &e.Kind, &e.Category, &e.DocumentType, &e.Document,
		&e.Name, &e.ContactName, &e.ContactPhone, &e.ContactEmail,
		&e.Phone, &e.Email, &e.Address, &e.City,
		&e.TermsDays, &e.CreditLimit, &e.Coverage, &e.IsActive,
		&e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &e, nil
}

func (r *ExternalRepository) FindByCompanyKindAndName(ctx context.Context, q db.DBExecutor, companyID int64, kind types.ExternalKind, name string) (*ExternalEntity, error) {
	const sql = `
		SELECT
			id, company_id, kind, category, document_type, document,
			name, contact_name, contact_phone, contact_email,
			phone, email, address, city,
			terms_days, credit_limit, coverage, is_active,
			created_at, updated_at
		FROM externals
		WHERE company_id = $1 AND kind = $2 AND LOWER(name) = LOWER($3)
	`
	var e ExternalEntity
	err := q.QueryRow(ctx, sql, companyID, kind, name).Scan(
		&e.ID, &e.CompanyID, &e.Kind, &e.Category, &e.DocumentType, &e.Document,
		&e.Name, &e.ContactName, &e.ContactPhone, &e.ContactEmail,
		&e.Phone, &e.Email, &e.Address, &e.City,
		&e.TermsDays, &e.CreditLimit, &e.Coverage, &e.IsActive,
		&e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &e, nil
}

func (r *ExternalRepository) List(ctx context.Context, q db.DBExecutor, f dtos.ExternalFilterQuery) ([]ExternalEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.Kind != nil && *f.Kind != "" {
		where = append(where, fmt.Sprintf("kind = $%d", argIdx))
		args = append(args, *f.Kind)
		argIdx++
	}

	if f.Category != nil && *f.Category != "" {
		where = append(where, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, *f.Category)
		argIdx++
	}

	if f.IsActive != nil {
		where = append(where, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *f.IsActive)
		argIdx++
	}

	if f.Search != "" {
		where = append(where, fmt.Sprintf("(name ILIKE $%d OR COALESCE(document, '') ILIKE $%d OR COALESCE(contact_name, '') ILIKE $%d OR COALESCE(email::text, '') ILIKE $%d OR COALESCE(phone, '') ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM externals %s", whereClause)
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
			id, company_id, kind, category, document_type, document,
			name, contact_name, contact_phone, contact_email,
			phone, email, address, city,
			terms_days, credit_limit, coverage, is_active,
			created_at, updated_at
		FROM externals
		%s
		ORDER BY id ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]ExternalEntity, 0)
	for rows.Next() {
		var e ExternalEntity
		if err := rows.Scan(
			&e.ID, &e.CompanyID, &e.Kind, &e.Category, &e.DocumentType, &e.Document,
			&e.Name, &e.ContactName, &e.ContactPhone, &e.ContactEmail,
			&e.Phone, &e.Email, &e.Address, &e.City,
			&e.TermsDays, &e.CreditLimit, &e.Coverage, &e.IsActive,
			&e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, e)
	}

	return list, total, rows.Err()
}

func (r *ExternalRepository) Create(ctx context.Context, q db.DBExecutor, e *ExternalEntity) (*ExternalEntity, error) {
	const sql = `
		INSERT INTO externals (
			company_id, kind, category, document_type, document,
			name, contact_name, contact_phone, contact_email,
			phone, email, address, city,
			terms_days, credit_limit, coverage, is_active
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13,
			$14, $15, $16, $17
		)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		e.CompanyID, e.Kind, e.Category, e.DocumentType, e.Document,
		e.Name, e.ContactName, e.ContactPhone, e.ContactEmail,
		e.Phone, e.Email, e.Address, e.City,
		e.TermsDays, e.CreditLimit, e.Coverage, e.IsActive,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *ExternalRepository) Update(ctx context.Context, q db.DBExecutor, e *ExternalEntity) (*ExternalEntity, error) {
	const sql = `
		UPDATE externals SET
			kind = $1,
			category = $2,
			document_type = $3,
			document = $4,
			name = $5,
			contact_name = $6,
			contact_phone = $7,
			contact_email = $8,
			phone = $9,
			email = $10,
			address = $11,
			city = $12,
			terms_days = $13,
			credit_limit = $14,
			coverage = $15,
			is_active = $16,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $17
		RETURNING updated_at
	`
	err := q.QueryRow(ctx, sql,
		e.Kind, e.Category, e.DocumentType, e.Document,
		e.Name, e.ContactName, e.ContactPhone, e.ContactEmail,
		e.Phone, e.Email, e.Address, e.City,
		e.TermsDays, e.CreditLimit, e.Coverage, e.IsActive, e.ID,
	).Scan(&e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *ExternalRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `UPDATE externals SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("externo no encontrado")
	}
	return nil
}

