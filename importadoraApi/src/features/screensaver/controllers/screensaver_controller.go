package controllers

// screensaver_controller.go · lee y guarda la imagen del protector (GET y POST/PUT de /settings/screensaver)
// conecta con: screensaver_service y screensaver_dto

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/screensaver/dtos"
	"importadoraApi/src/features/screensaver/services"

	"github.com/labstack/echo/v4"
)

type ScreensaverController struct {
	service *services.ScreensaverService
}

func NewScreensaverController(service *services.ScreensaverService) *ScreensaverController {
	return &ScreensaverController{service: service}
}

func (c *ScreensaverController) Get(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	companyID := int64(1)
	if actor != nil && actor.CompanyID != nil && *actor.CompanyID > 0 {
		companyID = *actor.CompanyID
	}

	res, err := c.service.GetSettings(ctx.Request().Context(), companyID)
	if err != nil {
		return utils.Internal("Error al consultar protector de pantalla.", err)
	}

	return utils.RespondOK(ctx, "Configuración del protector obtenida", res)
}

func (c *ScreensaverController) Update(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	companyID := int64(1)
	var employeeID *int64
	if actor != nil {
		if actor.CompanyID != nil && *actor.CompanyID > 0 {
			companyID = *actor.CompanyID
		}
		if actor.ActorID > 0 {
			employeeID = &actor.ActorID
		}
	}

	var req dtos.UpdateScreensaverSettingsRequest
	if err := ctx.Bind(&req); err != nil {
		return utils.BadRequest("INVALID_BODY", "Cuerpo de petición inválido.")
	}

	res, err := c.service.UpdateSettings(ctx.Request().Context(), companyID, &req, employeeID)
	if err != nil {
		return utils.BadRequest("UPDATE_FAILED", err.Error())
	}

	return utils.RespondOK(ctx, "Protector de pantalla actualizado exitosamente", res)
}
