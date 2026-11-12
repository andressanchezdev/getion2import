package repositories

// category_repo.go · acceso a la base de catálogo (marcas, categorías y modelos): aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de catálogo (marcas, categorías y modelos); los usan los services de catálogo (marcas, categorías y modelos)

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
	UpdatedAt   time.Time
}

type CategoryRepository struct{}

// NewCategoryRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewCategoryRepository() *CategoryRepository {
	return &CategoryRepository{}
}

// FindByID busca la categoría por su id (nil si no existe).
func (r *CategoryRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*CategoryEntity, error) {
	const sql = `
		SELECT
			c.id, c.company_id, c.parent_id, p.name,
			c.name, c.description, c.is_active, c.created_at, c.updated_at
		FROM categories c
		LEFT JOIN categories p ON p.id = c.parent_id
		WHERE c.id = $1
	`
	var cat CategoryEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&cat.ID, &cat.CompanyID, &cat.ParentID, &cat.ParentName,
		&cat.Name, &cat.Description, &cat.IsActive, &cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &cat, nil
}

// FindByCompanyParentAndName busca la categoría por compañía, padre y nombre (nil si no existe).
func (r *CategoryRepository) FindByCompanyParentAndName(ctx context.Context, q db.DBExecutor, companyID int64, parentID *int64, name string) (*CategoryEntity, error) {
	var sql string
	var err error
	var cat CategoryEntity

	if parentID == nil {
		sql = `
			SELECT id, company_id, parent_id, NULL, name, description, is_active, created_at, updated_at
			FROM categories
			WHERE company_id = $1 AND parent_id IS NULL AND LOWER(name) = LOWER($2)
		`
		err = q.QueryRow(ctx, sql, companyID, name).Scan(
			&cat.ID, &cat.CompanyID, &cat.ParentID, &cat.ParentName,
			&cat.Name, &cat.Description, &cat.IsActive, &cat.CreatedAt, &cat.UpdatedAt,
		)
	} else {
		sql = `
			SELECT id, company_id, parent_id, NULL, name, description, is_active, created_at, updated_at
			FROM categories
			WHERE company_id = $1 AND parent_id = $2 AND LOWER(name) = LOWER($3)
		`
		err = q.QueryRow(ctx, sql, companyID, *parentID, name).Scan(
			&cat.ID, &cat.CompanyID, &cat.ParentID, &cat.ParentName,
			&cat.Name, &cat.Description, &cat.IsActive, &cat.CreatedAt, &cat.UpdatedAt,
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

// ListByCompany lista las categorías de una compañía.
func (r *CategoryRepository) ListByCompany(ctx context.Context, q db.DBExecutor, companyID int64, activeOnly bool) ([]CategoryEntity, error) {
	sql := `
		SELECT
			c.id, c.company_id, c.parent_id, p.name,
			c.name, c.description, c.is_active, c.created_at, c.updated_at
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
			&cat.Name, &cat.Description, &cat.IsActive, &cat.CreatedAt, &cat.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, cat)
	}
	return list, rows.Err()
}

// Create inserta la categoría y devuelve el registro guardado.
func (r *CategoryRepository) Create(ctx context.Context, q db.DBExecutor, cat *CategoryEntity) (*CategoryEntity, error) {
	const sql = `
		INSERT INTO categories (company_id, parent_id, name, description, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		cat.CompanyID, cat.ParentID, cat.Name, cat.Description, cat.IsActive,
	).Scan(&cat.ID, &cat.CreatedAt, &cat.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return cat, nil
}

// Update actualiza los datos de la categoría.
func (r *CategoryRepository) Update(ctx context.Context, q db.DBExecutor, cat *CategoryEntity) (*CategoryEntity, error) {
	const sql = `
		UPDATE categories SET
			parent_id = $1,
			name = $2,
			description = $3,
			is_active = $4,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
		RETURNING updated_at
	`
	err := q.QueryRow(ctx, sql, cat.ParentID, cat.Name, cat.Description, cat.IsActive, cat.ID).Scan(&cat.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("categoría no encontrada")
		}
		return nil, err
	}
	return cat, nil
}

// SoftDelete marca la categoría como eliminada (borrado lógico: no se pierde el registro).
func (r *CategoryRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `UPDATE categories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("categoría no encontrada")
	}
	return nil
}

