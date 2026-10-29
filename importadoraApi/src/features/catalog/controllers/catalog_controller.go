package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/catalog/dtos"
	"importadoraApi/src/features/catalog/services"

	"github.com/labstack/echo/v4"
)

type CatalogController struct {
	service *services.CatalogService
}

func NewCatalogController(service *services.CatalogService) *CatalogController {
	return &CatalogController{service: service}
}

// ==========================================
// CONTROLADORES PARA MARCAS (BRANDS)
// ==========================================

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

// ==========================================
// CONTROLADORES PARA MODELOS (MODELS)
// ==========================================

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

// ==========================================
// CONTROLADORES PARA CATEGORÍAS (CATEGORIES)
// ==========================================

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

