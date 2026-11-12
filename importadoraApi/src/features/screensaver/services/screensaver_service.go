package services

// screensaver_service.go · lee y guarda la imagen del protector de pantalla de la compañía
// conecta con: screensaver_repo y screensaver_controller

import (
	"context"
	"errors"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/events"
	"importadoraApi/src/features/screensaver/dtos"
	"importadoraApi/src/features/screensaver/repositories"

	"github.com/jackc/pgx/v5"
)

type ScreensaverService struct {
	repo   *repositories.ScreensaverRepository
	events *events.Recorder
}

func NewScreensaverService(repo *repositories.ScreensaverRepository, recorder *events.Recorder) *ScreensaverService {
	return &ScreensaverService{repo: repo, events: recorder}
}

func (s *ScreensaverService) GetSettings(ctx context.Context, companyID int64) (*dtos.ScreensaverSettingsResponse, error) {
	if companyID <= 0 {
		companyID = 1
	}
	return s.repo.Get(ctx, companyID)
}

func (s *ScreensaverService) UpdateSettings(ctx context.Context, companyID int64, req *dtos.UpdateScreensaverSettingsRequest, employeeID *int64) (*dtos.ScreensaverSettingsResponse, error) {
	if companyID <= 0 {
		companyID = 1
	}
	if req.ImageURL == nil || *req.ImageURL == "" {
		return nil, errors.New("la URL o archivo de imagen es requerido")
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	// el guardado y su evento van en la misma transacción: todas las sesiones de la compañía cambian la imagen sin recargar
	return db.WithTxValue(ctx, s.repo.Pool(), func(ctx context.Context, tx pgx.Tx) (*dtos.ScreensaverSettingsResponse, error) {
		saved, err := s.repo.Upsert(ctx, tx, companyID, *req.ImageURL, isActive, employeeID)
		if err != nil {
			return nil, err
		}
		s.events.Record(ctx, events.NewEntityUpdated(companyID, nil, events.EntityRef{Kind: events.KindScreensaverSettings, ID: saved.ID, Version: saved.UpdatedAt}, saved, []string{"imageUrl", "isActive"}))
		return saved, nil
	})
}
