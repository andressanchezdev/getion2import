package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/sales/dtos"
	"importadoraApi/src/features/sales/services"

	"github.com/labstack/echo/v4"
)

type SaleController struct {
	saleService *services.SaleService
}

func NewSaleController(saleService *services.SaleService) *SaleController {
	return &SaleController{saleService: saleService}
}

// Create POST /sales
func (ctrl *SaleController) Create(c echo.Context) error {
	var req dtos.CreateSaleRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}

	companyID, _ := middlewares.EffectiveCompanyID(c)
	actor := middlewares.GetActor(c)

	actorEmployeeID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		actorEmployeeID = actor.ActorID
	}

	sale, err := ctrl.saleService.Create(c.Request().Context(), &companyID, actorEmployeeID, req)
	if err != nil {
		return err
	}

	return utils.RespondCreated(c, "Pedido registrado exitosamente", sale)
}

// FindByID GET /sales/:id
func (ctrl *SaleController) FindByID(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	sale, err := ctrl.saleService.FindByID(c.Request().Context(), id)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Venta recuperada", sale)
}

// List GET /sales
func (ctrl *SaleController) List(c echo.Context) error {
	var f dtos.SaleFilterQuery

	companyID, err := middlewares.EffectiveCompanyID(c)
	if err == nil && companyID > 0 {
		f.CompanyID = &companyID
	}

	if wid := c.QueryParam("warehouseId"); wid != "" {
		if id, err := strconv.ParseInt(wid, 10, 64); err == nil {
			f.WarehouseID = &id
		}
	}

	if cid := c.QueryParam("customerId"); cid != "" {
		if id, err := strconv.ParseInt(cid, 10, 64); err == nil {
			f.CustomerID = &id
		}
	}

	if eid := c.QueryParam("employeeId"); eid != "" {
		if id, err := strconv.ParseInt(eid, 10, 64); err == nil {
			f.EmployeeID = &id
		}
	}

	if st := c.QueryParam("status"); st != "" {
		s := types.SaleStatus(st)
		f.Status = &s
	}

	if stg := c.QueryParam("stage"); stg != "" {
		s := types.ProcessStage(stg)
		f.Stage = &s
	}

	if pm := c.QueryParam("paymentMethod"); pm != "" {
		p := types.PaymentMethod(pm)
		f.PaymentMethod = &p
	}

	f.Search = c.QueryParam("search")
	pg := utils.ParsePagination(c)
	f.Page = pg.Page
	f.PageSize = pg.PageSize

	sales, total, err := ctrl.saleService.List(c.Request().Context(), f)
	if err != nil {
		return err
	}

	meta := utils.BuildMeta(pg.Page, pg.PageSize, total)
	return utils.RespondPaginated(c, "Listado de ventas", sales, meta)
}

// AdvanceToVerification POST /sales/:id/verify
func (ctrl *SaleController) AdvanceToVerification(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	if err := ctrl.saleService.AdvanceToVerification(c.Request().Context(), id, empID); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Venta avanzada a etapa de verificación", nil)
}

// AdvanceToPicking POST /sales/:id/pick
func (ctrl *SaleController) AdvanceToPicking(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	if err := ctrl.saleService.AdvanceToPicking(c.Request().Context(), id, empID); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Venta avanzada a etapa de picking", nil)
}

// AdvanceToPacking POST /sales/:id/pack
func (ctrl *SaleController) AdvanceToPacking(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	if err := ctrl.saleService.AdvanceToPacking(c.Request().Context(), id, empID); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Venta avanzada a etapa de empaque", nil)
}

// IssueInvoice POST /sales/:id/invoice
func (ctrl *SaleController) IssueInvoice(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	invoice, err := ctrl.saleService.IssueInvoice(c.Request().Context(), id, empID)
	if err != nil {
		return err
	}

	return utils.RespondCreated(c, "Factura emitida exitosamente", invoice)
}

// AdvanceToDispatch POST /sales/:id/dispatch
func (ctrl *SaleController) AdvanceToDispatch(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	var req dtos.DispatchSaleRequest
	_ = utils.BindOptionalJSON(c, &req)

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	if err := ctrl.saleService.AdvanceToDispatch(c.Request().Context(), id, empID, req); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Pedido despachado y stock descontado con éxito", nil)
}

// AdvanceToSend POST /sales/:id/send
func (ctrl *SaleController) AdvanceToSend(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	if err := ctrl.saleService.AdvanceToSend(c.Request().Context(), id, empID); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Pedido marcado como enviado y venta completada", nil)
}

// CancelSale POST /sales/:id/cancel
func (ctrl *SaleController) CancelSale(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	var req dtos.CancelSaleRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	if err := ctrl.saleService.CancelSale(c.Request().Context(), id, empID, req); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Venta cancelada y reservas de stock liberadas", nil)
}

