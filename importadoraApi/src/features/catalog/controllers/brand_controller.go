package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/catalog/dtos"

	"github.com/labstack/echo/v4"
)

// ListBrands GET /brands
func (c *CatalogController) ListBrands(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}
	activeOnly := ctx.QueryParam("activeOnly") == "true"

	items, err := c.service.ListBrands(ctx.Request().Context(), actor, companyID, activeOnly)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Listado de marcas obtenido", items)
}

// GetBrandByID GET /brands/:id
func (c *CatalogController) GetBrandByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetBrandByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Detalle de marca obtenido", res)
}

// CreateBrand POST /brands
func (c *CatalogController) CreateBrand(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateBrandRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateBrand(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Marca creada exitosamente", res)
}

// UpdateBrand PUT /brands/:id
func (c *CatalogController) UpdateBrand(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateBrandRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UpdateBrand(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Marca actualizada exitosamente", res)
}

// DeleteBrand DELETE /brands/:id
func (c *CatalogController) DeleteBrand(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeleteBrand(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}

