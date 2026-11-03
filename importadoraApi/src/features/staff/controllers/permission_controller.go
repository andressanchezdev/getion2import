package controllers

// permission_controller.go · controlador HTTP de personal (administradores, empleados, roles y permisos): recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de personal (administradores, empleados, roles y permisos) y core/utils (respuestas y errores); los registra routes

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

