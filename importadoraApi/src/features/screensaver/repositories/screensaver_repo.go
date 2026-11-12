package repositories

// screensaver_repo.go · SQL de la tabla screensaver_settings (una fila por compañía)
// conecta con: screensaver_service

import (
	"context"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/screensaver/dtos"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ScreensaverRepository struct {
	pool *pgxpool.Pool
}

func NewScreensaverRepository(pool *pgxpool.Pool) *ScreensaverRepository {
	return &ScreensaverRepository{pool: pool}
}

func (r *ScreensaverRepository) Get(ctx context.Context, companyID int64) (*dtos.ScreensaverSettingsResponse, error) {
	query := `
		SELECT id, company_id, image_url, is_active, updated_at
		FROM screensaver_settings
		WHERE company_id = $1
		ORDER BY id DESC
		LIMIT 1;
	`
	row := r.pool.QueryRow(ctx, query, companyID)

	var res dtos.ScreensaverSettingsResponse
	err := row.Scan(&res.ID, &res.CompanyID, &res.ImageURL, &res.IsActive, &res.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return &dtos.ScreensaverSettingsResponse{
				ID:        0,
				CompanyID: companyID,
				ImageURL:  "",
				IsActive:  false,
				UpdatedAt: time.Now(),
			}, nil
		}
		return nil, err
	}
	return &res, nil
}

// Pool devuelve la conexión del repositorio, para que el servicio abra la transacción del guardado.
func (r *ScreensaverRepository) Pool() *pgxpool.Pool { return r.pool }

// Upsert guarda la imagen del protector con la conexión o la transacción que reciba.
func (r *ScreensaverRepository) Upsert(ctx context.Context, q db.DBExecutor, companyID int64, imageURL string, isActive bool, employeeID *int64) (*dtos.ScreensaverSettingsResponse, error) {
	query := `
		INSERT INTO screensaver_settings (company_id, image_url, is_active, updated_by, updated_at)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
		ON CONFLICT (company_id) DO UPDATE
		SET image_url = EXCLUDED.image_url,
		    is_active = EXCLUDED.is_active,
		    updated_by = EXCLUDED.updated_by,
		    updated_at = CURRENT_TIMESTAMP
		RETURNING id, company_id, image_url, is_active, updated_at;
	`
	var res dtos.ScreensaverSettingsResponse
	err := q.QueryRow(ctx, query, companyID, imageURL, isActive, employeeID).
		Scan(&res.ID, &res.CompanyID, &res.ImageURL, &res.IsActive, &res.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &res, nil
}
