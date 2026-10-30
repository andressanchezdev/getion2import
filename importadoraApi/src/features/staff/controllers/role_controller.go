package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/staff/dtos"

	"github.com/labstack/echo/v4"
)

// ListRoles GET /roles
func (c *StaffController) ListRoles(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	activeOnly := ctx.QueryParam("activeOnly") == "true"

	items, err := c.service.ListRoles(ctx.Request().Context(), actor, companyID, activeOnly)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Listado de roles obtenido", items)
}

// GetRoleByID GET /roles/:id
func (c *StaffController) GetRoleByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetRoleByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Detalle de rol obtenido", res)
}

// CreateRole POST /roles
func (c *StaffController) CreateRole(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateRoleRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateRole(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Rol creado exitosamente", res)
}

// UpdateRole PUT /roles/:id
func (c *StaffController) UpdateRole(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateRoleRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateRole(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Rol actualizado exitosamente", res)
}

// DeactivateRole DELETE /roles/:id
func (c *StaffController) DeactivateRole(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeactivateRole(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}

	return utils.RespondNoContent(ctx)
}

