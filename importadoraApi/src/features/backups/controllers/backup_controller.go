package controllers

// backup_controller.go · controlador HTTP de respaldos: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: el service y los dtos de respaldos y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/backups/dtos"
	"importadoraApi/src/features/backups/services"

	"github.com/labstack/echo/v4"
)

type BackupController struct {
	service *services.BackupService
}

// NewBackupController crea el controlador con las piezas que necesita para funcionar.
func NewBackupController(service *services.BackupService) *BackupController {
	return &BackupController{service: service}
}

// List GET /backups
func (ctrl *BackupController) List(c echo.Context) error {
	items, err := ctrl.service.List(c.Request().Context(), middlewares.GetActor(c))
	if err != nil {
		return err
	}
	return utils.RespondOK(c, "Respaldos obtenidos", items)
}

// Create POST /backups
func (ctrl *BackupController) Create(c echo.Context) error {
	var req dtos.CreateBackupRequest
	if err := utils.BindOptionalJSON(c, &req); err != nil {
		return err
	}
	resp, err := ctrl.service.Create(c.Request().Context(), middlewares.GetActor(c), req.Note, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		return err
	}
	return utils.RespondCreated(c, "Respaldo creado exitosamente", resp)
}

// Download GET /backups/:id/download
func (ctrl *BackupController) Download(c echo.Context) error {
	path, name, err := ctrl.service.Path(c.Request().Context(), middlewares.GetActor(c), c.Param("id"))
	if err != nil {
		return err
	}
	return c.Attachment(path, name)
}

// Restore POST /backups/:id/restore
func (ctrl *BackupController) Restore(c echo.Context) error {
	var req dtos.RestoreBackupRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}
	resp, err := ctrl.service.Restore(c.Request().Context(), middlewares.GetActor(c), c.Param("id"), req.Reason, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		return err
	}
	return utils.RespondOK(c, "Base de datos restaurada exitosamente", resp)
}
