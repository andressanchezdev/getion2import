package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/warehouses/dtos"

	"github.com/labstack/echo/v4"
)

// ListLocations GET /warehouses/:id/locations
func (c *WarehouseController) ListLocations(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	warehouseID, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	activeOnly := ctx.QueryParam("activeOnly") == "true"
	items, err := c.service.ListLocations(ctx.Request().Context(), actor, warehouseID, activeOnly)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Ubicaciones de bodega obtenidas", items)
}

// CreateLocation POST /warehouses/:id/locations
func (c *WarehouseController) CreateLocation(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	warehouseID, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.CreateWarehouseLocationRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateLocation(ctx.Request().Context(), actor, warehouseID, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Ubicación de bodega creada exitosamente", res)
}

// UpdateLocation PUT /warehouses/:id/locations/:locId
func (c *WarehouseController) UpdateLocation(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	warehouseID, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	locID, err := utils.ParamInt64(ctx, "locId")
	if err != nil {
		return err
	}

	var req dtos.UpdateWarehouseLocationRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateLocation(ctx.Request().Context(), actor, warehouseID, locID, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Ubicación de bodega actualizada exitosamente", res)
}

// DeleteLocation DELETE /warehouses/:id/locations/:locId
func (c *WarehouseController) DeleteLocation(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	warehouseID, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	locID, err := utils.ParamInt64(ctx, "locId")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeleteLocation(ctx.Request().Context(), actor, warehouseID, locID, ip, ua); err != nil {
		return err
	}

	return utils.RespondNoContent(ctx)
}

