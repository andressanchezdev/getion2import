package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/products/dtos"
	"importadoraApi/src/features/products/services"

	"github.com/labstack/echo/v4"
)

type ProductController struct {
	service *services.ProductService
}

func NewProductController(service *services.ProductService) *ProductController {
	return &ProductController{service: service}
}

// Create POST /products
func (c *ProductController) Create(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateProductRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Create(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Producto creado exitosamente", res)
}

// Get GET /products
func (c *ProductController) Get(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var categoryID *int64
	if catStr := ctx.QueryParam("categoryId"); catStr != "" {
		if cid, err := strconv.ParseInt(catStr, 10, 64); err == nil {
			categoryID = &cid
		}
	}

	var brandID *int64
	if bStr := ctx.QueryParam("brandId"); bStr != "" {
		if bid, err := strconv.ParseInt(bStr, 10, 64); err == nil {
			brandID = &bid
		}
	}

	var modelID *int64
	if mStr := ctx.QueryParam("modelId"); mStr != "" {
		if mid, err := strconv.ParseInt(mStr, 10, 64); err == nil {
			modelID = &mid
		}
	}

	var status *types.ProductStatus
	if st := ctx.QueryParam("status"); st != "" {
		parsed := types.ProductStatus(st)
		status = &parsed
	}

	var isPromotion *bool
	if promoStr := ctx.QueryParam("isPromotion"); promoStr != "" {
		b := promoStr == "true" || promoStr == "1"
		isPromotion = &b
	}

	filter := dtos.ProductFilterQuery{
		CompanyID:   companyID,
		CategoryID:  categoryID,
		BrandID:     brandID,
		ModelID:     modelID,
		Status:      status,
		IsPromotion: isPromotion,
		Search:      ctx.QueryParam("q"),
		Page:        params.Page,
		PageSize:    params.PageSize,
	}

	items, meta, err := c.service.List(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}
	return utils.RespondPaginated(ctx, "Listado de productos obtenido", items, *meta)
}

// Search GET /products/search (búsqueda rápida sobre easysearch)
func (c *ProductController) Search(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	query := ctx.QueryParam("q")
	params := utils.ParsePagination(ctx)

	items, meta, err := c.service.Search(ctx.Request().Context(), actor, query, params)
	if err != nil {
		return err
	}
	return utils.RespondPaginated(ctx, "Resultados de búsqueda de productos", items, *meta)
}

// GetByID GET /products/:id
func (c *ProductController) GetByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Detalle de producto obtenido", res)
}

// Update PUT /products/:id
func (c *ProductController) Update(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateProductRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Update(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Producto actualizado exitosamente", res)
}

// Delete DELETE /products/:id
func (c *ProductController) Delete(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.Delete(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}

// ==========================================
// CONTROLADORES PARA CÓDIGOS DE PRODUCTO
// ==========================================

// ListCodes GET /products/:id/codes
func (c *ProductController) ListCodes(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	codes, err := c.service.ListCodes(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Códigos del producto obtenidos", codes)
}

// CreateCode POST /products/:id/codes
func (c *ProductController) CreateCode(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.CreateProductCodeRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.CreateCode(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Código asignado exitosamente", res)
}

// DeleteCode DELETE /products/:id/codes/:codeId
func (c *ProductController) DeleteCode(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	codeID, err := utils.ParamInt64(ctx, "codeId")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeleteCode(ctx.Request().Context(), actor, id, codeID, ip, ua); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}

// ==========================================
// CONTROLADORES PARA PROVEEDORES DEL PRODUCTO
// ==========================================

// ListSuppliers GET /products/:id/suppliers
func (c *ProductController) ListSuppliers(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	suppliers, err := c.service.ListSuppliers(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Proveedores del producto obtenidos", suppliers)
}

// AssignSupplier POST /products/:id/suppliers
func (c *ProductController) AssignSupplier(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.AssignProductSupplierRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.AssignSupplier(ctx.Request().Context(), actor, id, req, ip, ua); err != nil {
		return err
	}
	return utils.RespondOK[any](ctx, "Proveedor asignado/actualizado en producto exitosamente", nil)
}

// RemoveSupplier DELETE /products/:id/suppliers/:supplierId
func (c *ProductController) RemoveSupplier(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	supplierID, err := utils.ParamInt64(ctx, "supplierId")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.RemoveSupplier(ctx.Request().Context(), actor, id, supplierID, ip, ua); err != nil {
		return err
	}
	return utils.RespondNoContent(ctx)
}

