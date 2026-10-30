package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/quotations/dtos"
	"importadoraApi/src/features/quotations/services"

	"github.com/labstack/echo/v4"
)

type QuotationController struct {
	service *services.QuotationService
}

func NewQuotationController(service *services.QuotationService) *QuotationController {
	return &QuotationController{service: service}
}

// List GET /quotations
func (c *QuotationController) List(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var customerID *int64
	if custStr := ctx.QueryParam("customerId"); custStr != "" {
		if cid, err := strconv.ParseInt(custStr, 10, 64); err == nil {
			customerID = &cid
		}
	}

	var employeeID *int64
	if empStr := ctx.QueryParam("employeeId"); empStr != "" {
		if eid, err := strconv.ParseInt(empStr, 10, 64); err == nil {
			employeeID = &eid
		}
	}

	var status *types.QuotationStatus
	if st := ctx.QueryParam("status"); st != "" {
		parsed := types.QuotationStatus(st)
		status = &parsed
	}

	filter := dtos.QuotationFilterQuery{
		CompanyID:  companyID,
		CustomerID: customerID,
		EmployeeID: employeeID,
		Status:     status,
		Search:     ctx.QueryParam("q"),
		Page:       params.Page,
		PageSize:   params.PageSize,
	}

	items, meta, err := c.service.List(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}
	return utils.RespondPaginated(ctx, "Listado de cotizaciones obtenido", items, *meta)
}

// GetByID GET /quotations/:id
func (c *QuotationController) GetByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Detalle de cotización obtenido", res)
}

// Create POST /quotations
func (c *QuotationController) Create(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateQuotationRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Create(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Cotización creada exitosamente", res)
}

// Update PUT /quotations/:id
func (c *QuotationController) Update(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateQuotationRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Update(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Cotización actualizada exitosamente", res)
}

