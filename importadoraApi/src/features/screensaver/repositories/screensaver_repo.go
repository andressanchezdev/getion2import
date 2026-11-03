package repositories

// screensaver_repo.go · SQL de la tabla screensaver_settings (una fila por compañía)
// conecta con: screensaver_service

import (
	"context"
	"time"

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
			// Retornar default si no existe fila
			return &dtos.ScreensaverSettingsResponse{
				ID:        0,
				CompanyID: companyID,
				ImageURL:  "/assets/images/screensaver-logo.jpg",
				IsActive:  true,
				UpdatedAt: time.Now(),
			}, nil
		}
		return nil, err
	}
	return &res, nil
}

func (r *ScreensaverRepository) Upsert(ctx context.Context, companyID int64, imageURL string, isActive bool, employeeID *int64) (*dtos.ScreensaverSettingsResponse, error) {
	// Si existe registro lo actualizamos, si no lo insertamos
	var existingID int64
	err := r.pool.QueryRow(ctx, "SELECT id FROM screensaver_settings WHERE company_id = $1 ORDER BY id DESC LIMIT 1", companyID).Scan(&existingID)
	if err == nil {
		updateQuery := `
			UPDATE screensaver_settings
			SET image_url = $2, is_active = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
			WHERE id = $1
			RETURNING id, company_id, image_url, is_active, updated_at;
		`
		var res dtos.ScreensaverSettingsResponse
		errUpdate := r.pool.QueryRow(ctx, updateQuery, existingID, imageURL, isActive, employeeID).
			Scan(&res.ID, &res.CompanyID, &res.ImageURL, &res.IsActive, &res.UpdatedAt)
		if errUpdate != nil {
			return nil, errUpdate
		}
		return &res, nil
	}

	insertQuery := `
		INSERT INTO screensaver_settings (company_id, image_url, is_active, updated_by, updated_at)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
		RETURNING id, company_id, image_url, is_active, updated_at;
	`
	var res dtos.ScreensaverSettingsResponse
	errInsert := r.pool.QueryRow(ctx, insertQuery, companyID, imageURL, isActive, employeeID).
		Scan(&res.ID, &res.CompanyID, &res.ImageURL, &res.IsActive, &res.UpdatedAt)
	if errInsert != nil {
		return nil, errInsert
	}
	return &res, nil
}
