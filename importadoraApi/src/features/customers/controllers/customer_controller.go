package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/customers/dtos"
	"importadoraApi/src/features/customers/services"

	"github.com/labstack/echo/v4"
)

type CustomerController struct {
	service *services.CustomerService
}

func NewCustomerController(service *services.CustomerService) *CustomerController {
	return &CustomerController{service: service}
}

// ListSelector GET /customers/selector
func (c *CustomerController) ListSelector(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	search := ctx.QueryParam("q")
	res, err := c.service.ListSelector(ctx.Request().Context(), actor, search)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Selector de clientes obtenido", res)
}

// Create POST /customers
func (c *CustomerController) Create(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateCustomerRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Create(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Cliente creado exitosamente", res)
}

// Get GET /customers
func (c *CustomerController) Get(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var status *types.CustomerStatus
	if st := ctx.QueryParam("status"); st != "" {
		parsed := types.CustomerStatus(st)
		status = &parsed
	}

	var creditEnabled *bool
	if ce := ctx.QueryParam("creditEnabled"); ce != "" {
		b := ce == "true" || ce == "1"
		creditEnabled = &b
	}

	var priceTier *types.PriceTier
	if pt := ctx.QueryParam("priceTier"); pt != "" {
		parsed := types.PriceTier(pt)
		priceTier = &parsed
	}

	filter := dtos.CustomerFilterQuery{
		CompanyID:     companyID,
		Status:        status,
		CreditEnabled: creditEnabled,
		PriceTier:     priceTier,
		Search:        ctx.QueryParam("q"),
		Page:          params.Page,
		PageSize:      params.PageSize,
	}

	items, meta, err := c.service.List(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Listado de clientes obtenido", items, *meta)
}

// Search GET /customers/search
func (c *CustomerController) Search(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	query := ctx.QueryParam("q")
	params := utils.ParsePagination(ctx)

	items, meta, err := c.service.Search(ctx.Request().Context(), actor, query, params)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Resultados de búsqueda de clientes", items, *meta)
}

// GetByID GET /customers/:id
func (c *CustomerController) GetByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Detalle de cliente obtenido", res)
}

// Update PUT /customers/:id
func (c *CustomerController) Update(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateCustomerRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Update(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Cliente actualizado exitosamente", res)
}

// Delete DELETE /customers/:id
func (c *CustomerController) Delete(ctx echo.Context) error {
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

// GetCreditStatus GET /customers/:id/credit-status
func (c *CustomerController) GetCreditStatus(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var companyID int64
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	res, err := c.service.GetCreditStatus(ctx.Request().Context(), companyID, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Estado de crédito obtenido exitosamente", res)
}
