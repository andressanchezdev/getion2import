package repositories

// model_repo.go · acceso a la base de catálogo (marcas, categorías y modelos): aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de catálogo (marcas, categorías y modelos); los usan los services de catálogo (marcas, categorías y modelos)

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

type ModelEntity struct {
	ID          int64
	CompanyID   int64
	Name        string
	Description *string
	IsActive    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type ModelRepository struct{}

// NewModelRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewModelRepository() *ModelRepository {
	return &ModelRepository{}
}

// FindByID busca el modelo de moto por su id (nil si no existe).
func (r *ModelRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*ModelEntity, error) {
	const sql = `SELECT id, company_id, name, description, is_active, created_at, updated_at FROM models WHERE id = $1`
	var m ModelEntity
	err := q.QueryRow(ctx, sql, id).Scan(&m.ID, &m.CompanyID, &m.Name, &m.Description, &m.IsActive, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// FindByCompanyAndName busca el modelo de moto por compañía y nombre (nil si no existe).
func (r *ModelRepository) FindByCompanyAndName(ctx context.Context, q db.DBExecutor, companyID int64, name string) (*ModelEntity, error) {
	const sql = `SELECT id, company_id, name, description, is_active, created_at, updated_at FROM models WHERE company_id = $1 AND LOWER(name) = LOWER($2)`
	var m ModelEntity
	err := q.QueryRow(ctx, sql, companyID, name).Scan(&m.ID, &m.CompanyID, &m.Name, &m.Description, &m.IsActive, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// ListByCompany lista los modelos de moto de una compañía.
func (r *ModelRepository) ListByCompany(ctx context.Context, q db.DBExecutor, companyID int64, activeOnly bool) ([]ModelEntity, error) {
	sql := `SELECT id, company_id, name, description, is_active, created_at, updated_at FROM models WHERE company_id = $1`
	if activeOnly {
		sql += " AND is_active = TRUE"
	}
	sql += " ORDER BY name ASC"

	rows, err := q.Query(ctx, sql, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]ModelEntity, 0)
	for rows.Next() {
		var m ModelEntity
		if err := rows.Scan(&m.ID, &m.CompanyID, &m.Name, &m.Description, &m.IsActive, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

// Create inserta el modelo de moto y devuelve el registro guardado.
func (r *ModelRepository) Create(ctx context.Context, q db.DBExecutor, m *ModelEntity) (*ModelEntity, error) {
	const sql = `
		INSERT INTO models (company_id, name, description, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql, m.CompanyID, m.Name, m.Description, m.IsActive).Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

// Update actualiza los datos de el modelo de moto.
func (r *ModelRepository) Update(ctx context.Context, q db.DBExecutor, m *ModelEntity) (*ModelEntity, error) {
	const sql = `UPDATE models SET name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING updated_at`
	err := q.QueryRow(ctx, sql, m.Name, m.Description, m.IsActive, m.ID).Scan(&m.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("modelo no encontrado")
		}
		return nil, err
	}
	return m, nil
}

// SoftDelete marca el modelo de moto como eliminado (borrado lógico: no se pierde el registro).
func (r *ModelRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `UPDATE models SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("modelo no encontrado")
	}
	return nil
}

