package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/catalog/dtos"

	"github.com/labstack/echo/v4"
)

// ListModels GET /models
func (c *CatalogController) ListModels(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}
	activeOnly := ctx.QueryParam("activeOnly") == "true"

	items, err := c.service.ListModels(ctx.Request().Context(), actor, companyID, activeOnly)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Listado de modelos obtenido", items)
}

// GetModelByID GET /models/:id
func (c *CatalogController) GetModelByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetModelByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Detalle de modelo obtenido", res)
}

// CreateModel POST /models
func (c *CatalogController) CreateModel(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateModelRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateModel(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Modelo creado exitosamente", res)
}

// UpdateModel PUT /models/:id
func (c *CatalogController) UpdateModel(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateModelRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateModel(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Modelo actualizado exitosamente", res)
}

// DeleteModel DELETE /models/:id
func (c *CatalogController) DeleteModel(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeleteModel(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}

