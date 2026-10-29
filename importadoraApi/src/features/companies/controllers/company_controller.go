package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/companies/dtos"
	"importadoraApi/src/features/companies/services"

	"github.com/labstack/echo/v4"
)

type CompanyController struct {
	service *services.CompanyService
}

func NewCompanyController(service *services.CompanyService) *CompanyController {
	return &CompanyController{service: service}
}

// Create POST /companies (CREATE)
func (c *CompanyController) Create(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateCompanyRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Create(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Compañía creada exitosamente", res)
}

// Get GET /companies (GET listado paginado)
func (c *CompanyController) Get(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	items, meta, err := c.service.List(ctx.Request().Context(), actor, params)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Listado de compañías obtenido", items, *meta)
}

// GetByID GET /companies/:id (SEARCH BY ID)
func (c *CompanyController) GetByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Detalle de compañía obtenido", res)
}

// Search GET /companies/search (SEARCH por coincidencia de texto)
func (c *CompanyController) Search(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	query := ctx.QueryParam("q")
	params := utils.ParsePagination(ctx)

	items, meta, err := c.service.Search(ctx.Request().Context(), actor, query, params)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Resultados de búsqueda de compañías", items, *meta)
}

// Update PUT /companies/:id (PUT actualización)
func (c *CompanyController) Update(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateCompanyRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Update(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Compañía actualizada exitosamente", res)
}

// Delete DELETE /companies/:id (DELETE retiro de la operación)
func (c *CompanyController) Delete(ctx echo.Context) error {
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

