package dtos

// screensaver_dto.go · formas de entrada y salida de /settings/screensaver (la imagen del protector y si está activo)
// conecta con: screensaver_controller y screensaver_service

import "time"

type ScreensaverSettingsResponse struct {
	ID        int64     `json:"id"`
	CompanyID int64     `json:"companyId"`
	ImageURL  string    `json:"imageUrl"`
	IsActive  bool      `json:"isActive"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type UpdateScreensaverSettingsRequest struct {
	ImageURL *string `json:"imageUrl" validate:"required"`
	IsActive *bool   `json:"isActive"`
}
