package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/staff/dtos"

	"github.com/labstack/echo/v4"
)

// ListAdmins GET /admins
func (c *StaffController) ListAdmins(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var isActive *bool
	if activeStr := ctx.QueryParam("isActive"); activeStr != "" {
		active := activeStr == "true" || activeStr == "1"
		isActive = &active
	}

	filter := dtos.AdminFilterQuery{
		CompanyID: companyID,
		IsActive:  isActive,
		Search:    ctx.QueryParam("q"),
		Page:      params.Page,
		PageSize:  params.PageSize,
	}

	items, meta, err := c.service.ListAdmins(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Listado de administradores obtenido", items, *meta)
}

// GetAdminByID GET /admins/:id
func (c *StaffController) GetAdminByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetAdminByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Detalle de administrador obtenido", res)
}

// CreateAdmin POST /admins
func (c *StaffController) CreateAdmin(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateAdminRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateAdmin(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Administrador creado exitosamente", res)
}

// UpdateAdmin PUT /admins/:id
func (c *StaffController) UpdateAdmin(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateAdminRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateAdmin(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Administrador actualizado exitosamente", res)
}

// DeactivateAdmin DELETE /admins/:id
func (c *StaffController) DeactivateAdmin(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeactivateAdmin(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}

	return utils.RespondNoContent(ctx)
}

