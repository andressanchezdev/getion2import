package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/staff/dtos"
	"importadoraApi/src/features/staff/services"

	"github.com/labstack/echo/v4"
)

type StaffController struct {
	service *services.StaffService
}

func NewStaffController(service *services.StaffService) *StaffController {
	return &StaffController{service: service}
}

// ==========================================
// CONTROLADORES PARA ADMINS
// ==========================================

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

// ==========================================
// CONTROLADORES PARA ROLES
// ==========================================

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

// ==========================================
// CONTROLADORES PARA PERMISOS
// ==========================================

// ListPermissions GET /permissions
func (c *StaffController) ListPermissions(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	items, err := c.service.ListPermissions(ctx.Request().Context(), actor)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Catálogo de permisos obtenido", items)
}

// ==========================================
// CONTROLADORES PARA EMPLEADOS
// ==========================================

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

