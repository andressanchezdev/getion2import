package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/warehouses/dtos"
	"importadoraApi/src/features/warehouses/services"

	"github.com/labstack/echo/v4"
)

type WarehouseController struct {
	service *services.WarehouseService
}

func NewWarehouseController(service *services.WarehouseService) *WarehouseController {
	return &WarehouseController{service: service}
}

// Get GET /warehouses
func (c *WarehouseController) Get(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	items, meta, err := c.service.List(ctx.Request().Context(), actor, params)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Listado de bodegas obtenido", items, *meta)
}

// GetByID GET /warehouses/:id
func (c *WarehouseController) GetByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Detalle de bodega obtenido", res)
}

// Search GET /warehouses/search?q=...
func (c *WarehouseController) Search(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	query := ctx.QueryParam("q")
	params := utils.ParsePagination(ctx)

	items, meta, err := c.service.Search(ctx.Request().Context(), actor, query, params)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Resultados de búsqueda de bodegas", items, *meta)
}

// Create POST /warehouses
func (c *WarehouseController) Create(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateWarehouseRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Create(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Bodega registrada exitosamente con sus series fiscales", res)
}

// Update PUT /warehouses/:id
func (c *WarehouseController) Update(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateWarehouseRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Update(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Bodega actualizada exitosamente", res)
}

// Deactivate DELETE /warehouses/:id
func (c *WarehouseController) Deactivate(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.Deactivate(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}

	return utils.RespondNoContent(ctx)
}

// GetFacturation GET /warehouses/:id/facturation
func (c *WarehouseController) GetFacturation(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetFacturation(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Configuración fiscal de bodega obtenida", res)
}

// UpdateFacturation PUT /warehouses/:id/facturation
func (c *WarehouseController) UpdateFacturation(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateFacturationRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateFacturation(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Configuración fiscal actualizada exitosamente", res)
}

// ListDocSeries GET /doc-series
func (c *WarehouseController) ListDocSeries(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var whID *int64
	whQuery := ctx.QueryParam("warehouseId")
	if whQuery != "" {
		if parsed, err := strconv.ParseInt(whQuery, 10, 64); err == nil && parsed > 0 {
			whID = &parsed
		}
	}

	var docType *types.DocSeriesType
	typeQuery := ctx.QueryParam("docType")
	if typeQuery != "" {
		dt := types.DocSeriesType(typeQuery)
		docType = &dt
	}

	items, err := c.service.ListDocSeries(ctx.Request().Context(), actor, whID, docType)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Series numéricas obtenidas", items)
}

// UpdateDocSeries PUT /doc-series/:id
func (c *WarehouseController) UpdateDocSeries(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateDocSeriesRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateDocSeries(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Serie numérica actualizada exitosamente", res)
}
