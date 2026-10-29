package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/externals/dtos"
	"importadoraApi/src/features/externals/services"

	"github.com/labstack/echo/v4"
)

type ExternalController struct {
	service *services.ExternalService
}

func NewExternalController(service *services.ExternalService) *ExternalController {
	return &ExternalController{service: service}
}

// Create POST /externals
func (c *ExternalController) Create(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateExternalRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Create(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Registro externo creado exitosamente", res)
}

// Get GET /externals
func (c *ExternalController) Get(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var kind *types.ExternalKind
	if k := ctx.QueryParam("kind"); k != "" {
		parsed := types.ExternalKind(k)
		kind = &parsed
	}

	var category *string
	if cat := ctx.QueryParam("category"); cat != "" {
		category = &cat
	}

	var isActive *bool
	if activeStr := ctx.QueryParam("isActive"); activeStr != "" {
		b := activeStr == "true" || activeStr == "1"
		isActive = &b
	}

	filter := dtos.ExternalFilterQuery{
		CompanyID: companyID,
		Kind:      kind,
		Category:  category,
		IsActive:  isActive,
		Search:    ctx.QueryParam("q"),
		Page:      params.Page,
		PageSize:  params.PageSize,
	}

	items, meta, err := c.service.List(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Listado de externos obtenido", items, *meta)
}

// Search GET /externals/search
func (c *ExternalController) Search(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	query := ctx.QueryParam("q")
	params := utils.ParsePagination(ctx)

	items, meta, err := c.service.Search(ctx.Request().Context(), actor, query, params)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Resultados de búsqueda de externos", items, *meta)
}

// GetByID GET /externals/:id
func (c *ExternalController) GetByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Detalle de externo obtenido", res)
}

// Update PUT /externals/:id
func (c *ExternalController) Update(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateExternalRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Update(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Registro externo actualizado exitosamente", res)
}

// Delete DELETE /externals/:id
func (c *ExternalController) Delete(ctx echo.Context) error {
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

