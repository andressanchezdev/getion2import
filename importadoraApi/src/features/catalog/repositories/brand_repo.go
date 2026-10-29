package repositories

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

type BrandEntity struct {
	ID        int64
	CompanyID int64
	Name      string
	ImageURL  *string
	IsActive  bool
	CreatedAt time.Time
}

type BrandRepository struct{}

func NewBrandRepository() *BrandRepository {
	return &BrandRepository{}
}

func (r *BrandRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*BrandEntity, error) {
	const sql = `SELECT id, company_id, name, image_url, is_active, created_at FROM brands WHERE id = $1`
	var b BrandEntity
	err := q.QueryRow(ctx, sql, id).Scan(&b.ID, &b.CompanyID, &b.Name, &b.ImageURL, &b.IsActive, &b.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &b, nil
}

func (r *BrandRepository) FindByCompanyAndName(ctx context.Context, q db.DBExecutor, companyID int64, name string) (*BrandEntity, error) {
	const sql = `SELECT id, company_id, name, image_url, is_active, created_at FROM brands WHERE company_id = $1 AND LOWER(name) = LOWER($2)`
	var b BrandEntity
	err := q.QueryRow(ctx, sql, companyID, name).Scan(&b.ID, &b.CompanyID, &b.Name, &b.ImageURL, &b.IsActive, &b.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &b, nil
}

func (r *BrandRepository) ListByCompany(ctx context.Context, q db.DBExecutor, companyID int64, activeOnly bool) ([]BrandEntity, error) {
	sql := `SELECT id, company_id, name, image_url, is_active, created_at FROM brands WHERE company_id = $1`
	if activeOnly {
		sql += " AND is_active = TRUE"
	}
	sql += " ORDER BY name ASC"

	rows, err := q.Query(ctx, sql, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]BrandEntity, 0)
	for rows.Next() {
		var b BrandEntity
		if err := rows.Scan(&b.ID, &b.CompanyID, &b.Name, &b.ImageURL, &b.IsActive, &b.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, b)
	}
	return list, rows.Err()
}

func (r *BrandRepository) Create(ctx context.Context, q db.DBExecutor, b *BrandEntity) (*BrandEntity, error) {
	const sql = `
		INSERT INTO brands (company_id, name, image_url, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	err := q.QueryRow(ctx, sql, b.CompanyID, b.Name, b.ImageURL, b.IsActive).Scan(&b.ID, &b.CreatedAt)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func (r *BrandRepository) Update(ctx context.Context, q db.DBExecutor, b *BrandEntity) (*BrandEntity, error) {
	const sql = `UPDATE brands SET name = $1, image_url = $2, is_active = $3 WHERE id = $4`
	cmdTag, err := q.Exec(ctx, sql, b.Name, b.ImageURL, b.IsActive, b.ID)
	if err != nil {
		return nil, err
	}
	if cmdTag.RowsAffected() == 0 {
		return nil, errors.New("marca no encontrada")
	}
	return b, nil
}

func (r *BrandRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `UPDATE brands SET is_active = FALSE WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("marca no encontrada")
	}
	return nil
}

