package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/staff/dtos"

	"github.com/labstack/echo/v4"
)

// ListSalespersons GET /staff/salespersons
func (c *StaffController) ListSalespersons(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	salespersons, err := c.service.ListSalespersons(ctx.Request().Context(), actor)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Listado de asesores comerciales obtenido", salespersons)
}

// ListEmployees GET /employees
func (c *StaffController) ListEmployees(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var roleID *int64
	if ridStr := ctx.QueryParam("roleId"); ridStr != "" {
		if rid, err := strconv.ParseInt(ridStr, 10, 64); err == nil {
			roleID = &rid
		}
	}

	var warehouseID *int64
	if widStr := ctx.QueryParam("warehouseId"); widStr != "" {
		if wid, err := strconv.ParseInt(widStr, 10, 64); err == nil {
			warehouseID = &wid
		}
	}

	var status *string
	if st := ctx.QueryParam("status"); st != "" {
		status = &st
	}

	filter := dtos.EmployeeFilterQuery{
		CompanyID:   companyID,
		RoleID:      roleID,
		WarehouseID: warehouseID,
		Status:      status,
		Search:      ctx.QueryParam("q"),
		Page:        params.Page,
		PageSize:    params.PageSize,
	}

	items, meta, err := c.service.ListEmployees(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Listado de empleados obtenido", items, *meta)
}

// GetEmployeeByID GET /employees/:id
func (c *StaffController) GetEmployeeByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetEmployeeByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Detalle de empleado obtenido", res)
}

// CreateEmployee POST /employees
func (c *StaffController) CreateEmployee(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateEmployeeRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateEmployee(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Empleado registrado exitosamente", res)
}

// UpdateEmployee PUT /employees/:id
func (c *StaffController) UpdateEmployee(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateEmployeeRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateEmployee(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Empleado actualizado exitosamente", res)
}

// DeactivateEmployee DELETE /employees/:id
func (c *StaffController) DeactivateEmployee(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeactivateEmployee(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}

	return utils.RespondNoContent(ctx)
}

// UpdateEmployeeCredentials PUT /employees/:id/credentials
func (c *StaffController) UpdateEmployeeCredentials(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateCredentialsRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.UpdateEmployeeCredentials(ctx.Request().Context(), actor, id, req, ip, ua); err != nil {
		return err
	}

	return utils.RespondOK[any](ctx, "Contraseña actualizada exitosamente", nil)
}

// GetEmployeePermissions GET /employees/:id/permissions
func (c *StaffController) GetEmployeePermissions(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	perms, err := c.service.GetEmployeePermissions(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Permisos del empleado obtenidos", perms)
}

// AssignEmployeePermissions PUT /employees/:id/permissions
func (c *StaffController) AssignEmployeePermissions(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.AssignEmployeePermissionsRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	perms, err := c.service.AssignEmployeePermissions(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Permisos actualizados exitosamente", perms)
}

// UnlockEmployee POST /employees/:id/unlock
func (c *StaffController) UnlockEmployee(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UnlockEmployee(ctx.Request().Context(), actor, id, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Empleado desbloqueado exitosamente", res)
}

