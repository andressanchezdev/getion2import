package services

// screensaver_service.go · lee y guarda la imagen del protector de pantalla de la compañía
// conecta con: screensaver_repo y screensaver_controller

import (
	"context"
	"errors"

	"importadoraApi/src/features/screensaver/dtos"
	"importadoraApi/src/features/screensaver/repositories"
)

type ScreensaverService struct {
	repo *repositories.ScreensaverRepository
}

func NewScreensaverService(repo *repositories.ScreensaverRepository) *ScreensaverService {
	return &ScreensaverService{repo: repo}
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

	return s.repo.Upsert(ctx, companyID, *req.ImageURL, isActive, employeeID)
}
