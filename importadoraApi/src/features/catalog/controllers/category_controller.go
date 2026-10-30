package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/catalog/dtos"

	"github.com/labstack/echo/v4"
)

// ListCategories GET /categories
func (c *CatalogController) ListCategories(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}
	activeOnly := ctx.QueryParam("activeOnly") == "true"

	items, err := c.service.ListCategories(ctx.Request().Context(), actor, companyID, activeOnly)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Listado de categorías obtenido", items)
}

// GetCategoryByID GET /categories/:id
func (c *CatalogController) GetCategoryByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetCategoryByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Detalle de categoría obtenido", res)
}

// CreateCategory POST /categories
func (c *CatalogController) CreateCategory(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateCategoryRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateCategory(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Categoría creada exitosamente", res)
}

// UpdateCategory PUT /categories/:id
func (c *CatalogController) UpdateCategory(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateCategoryRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateCategory(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Categoría actualizada exitosamente", res)
}

// DeleteCategory DELETE /categories/:id
func (c *CatalogController) DeleteCategory(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeleteCategory(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}

