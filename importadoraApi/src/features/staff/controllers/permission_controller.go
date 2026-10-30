package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
)

// ListPermissions GET /permissions
func (c *StaffController) ListPermissions(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	items, err := c.service.ListPermissions(ctx.Request().Context(), actor)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Catálogo de permisos obtenido", items)
}

