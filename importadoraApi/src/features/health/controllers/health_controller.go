package controllers

import (
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/health/services"

	"github.com/labstack/echo/v4"
)

type HealthController struct {
	service *services.HealthService
}

func NewHealthController(service *services.HealthService) *HealthController {
	return &HealthController{service: service}
}

func (c *HealthController) Check(ctx echo.Context) error {
	res, err := c.service.Check(ctx.Request().Context())
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Servicio activo", res)
}

func (c *HealthController) Readiness(ctx echo.Context) error {
	res, err := c.service.Readiness(ctx.Request().Context())
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Base de datos lista", res)
}

