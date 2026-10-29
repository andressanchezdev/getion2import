package repositories

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

type CategoryEntity struct {
	ID          int64
	CompanyID   int64
	ParentID    *int64
	ParentName  *string
	Name        string
	Description *string
	IsActive    bool
	CreatedAt   time.Time
}

type CategoryRepository struct{}

func NewCategoryRepository() *CategoryRepository {
	return &CategoryRepository{}
}

func (r *CategoryRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*CategoryEntity, error) {
	const sql = `
		SELECT
			c.id, c.company_id, c.parent_id, p.name,
			c.name, c.description, c.is_active, c.created_at
		FROM categories c
		LEFT JOIN categories p ON p.id = c.parent_id
		WHERE c.id = $1
	`
	var cat CategoryEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&cat.ID, &cat.CompanyID, &cat.ParentID, &cat.ParentName,
		&cat.Name, &cat.Description, &cat.IsActive, &cat.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}

func (r *CategoryRepository) FindByCompanyParentAndName(ctx context.Context, q db.DBExecutor, companyID int64, parentID *int64, name string) (*CategoryEntity, error) {
	var sql string
	var err error
	var cat CategoryEntity

	if parentID == nil {
		sql = `
			SELECT id, company_id, parent_id, NULL, name, description, is_active, created_at
			FROM categories
			WHERE company_id = $1 AND parent_id IS NULL AND LOWER(name) = LOWER($2)
		`
		err = q.QueryRow(ctx, sql, companyID, name).Scan(
			&cat.ID, &cat.CompanyID, &cat.ParentID, &cat.ParentName,
			&cat.Name, &cat.Description, &cat.IsActive, &cat.CreatedAt,
		)
	} else {
		sql = `
			SELECT id, company_id, parent_id, NULL, name, description, is_active, created_at
			FROM categories
			WHERE company_id = $1 AND parent_id = $2 AND LOWER(name) = LOWER($3)
		`
		err = q.QueryRow(ctx, sql, companyID, *parentID, name).Scan(
			&cat.ID, &cat.CompanyID, &cat.ParentID, &cat.ParentName,
			&cat.Name, &cat.Description, &cat.IsActive, &cat.CreatedAt,
		)
	}

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}

func (r *CategoryRepository) ListByCompany(ctx context.Context, q db.DBExecutor, companyID int64, activeOnly bool) ([]CategoryEntity, error) {
	sql := `
		SELECT
			c.id, c.company_id, c.parent_id, p.name,
			c.name, c.description, c.is_active, c.created_at
		FROM categories c
		LEFT JOIN categories p ON p.id = c.parent_id
		WHERE c.company_id = $1
	`
	if activeOnly {
		sql += " AND c.is_active = TRUE"
	}
	sql += " ORDER BY COALESCE(c.parent_id, 0) ASC, c.name ASC"

	rows, err := q.Query(ctx, sql, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]CategoryEntity, 0)
	for rows.Next() {
		var cat CategoryEntity
		if err := rows.Scan(
			&cat.ID, &cat.CompanyID, &cat.ParentID, &cat.ParentName,
			&cat.Name, &cat.Description, &cat.IsActive, &cat.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, cat)
	}
	return list, rows.Err()
}

func (r *CategoryRepository) Create(ctx context.Context, q db.DBExecutor, cat *CategoryEntity) (*CategoryEntity, error) {
	const sql = `
		INSERT INTO categories (company_id, parent_id, name, description, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	err := q.QueryRow(ctx, sql,
		cat.CompanyID, cat.ParentID, cat.Name, cat.Description, cat.IsActive,
	).Scan(&cat.ID, &cat.CreatedAt)
	if err != nil {
		return nil, err
	}
	return cat, nil
}

func (r *CategoryRepository) Update(ctx context.Context, q db.DBExecutor, cat *CategoryEntity) (*CategoryEntity, error) {
	const sql = `
		UPDATE categories SET
			parent_id = $1,
			name = $2,
			description = $3,
			is_active = $4
		WHERE id = $5
	`
	cmdTag, err := q.Exec(ctx, sql, cat.ParentID, cat.Name, cat.Description, cat.IsActive, cat.ID)
	if err != nil {
		return nil, err
	}
	if cmdTag.RowsAffected() == 0 {
		return nil, errors.New("categoría no encontrada")
	}
	return cat, nil
}

func (r *CategoryRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `UPDATE categories SET is_active = FALSE WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("categoría no encontrada")
	}
	return nil
}

