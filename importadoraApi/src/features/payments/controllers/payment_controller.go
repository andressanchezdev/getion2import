package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/payments/dtos"
	"importadoraApi/src/features/payments/services"

	"github.com/labstack/echo/v4"
)

type PaymentController struct {
	service *services.PaymentService
}

func NewPaymentController(service *services.PaymentService) *PaymentController {
	return &PaymentController{service: service}
}

// Create POST /payments
func (ctrl *PaymentController) Create(c echo.Context) error {
	var req dtos.CreatePaymentRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	ip := c.RealIP()
	ua := c.Request().UserAgent()

	resp, err := ctrl.service.Create(c.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(c, "Pago registrado correctamente (en espera de verificación)", resp)
}

// FindByID GET /payments/:id
func (ctrl *PaymentController) FindByID(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	resp, err := ctrl.service.FindByID(c.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Detalle de pago obtenido", resp)
}

// List GET /payments
func (ctrl *PaymentController) List(c echo.Context) error {
	actor := middlewares.GetActor(c)
	params := utils.ParsePagination(c)

	var saleID *int64
	if sidStr := c.QueryParam("saleId"); sidStr != "" {
		if sid, err := strconv.ParseInt(sidStr, 10, 64); err == nil {
			saleID = &sid
		}
	}

	var customerID *int64
	if cidStr := c.QueryParam("customerId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			customerID = &cid
		}
	}

	var status *types.PaymentStatus
	if st := c.QueryParam("status"); st != "" {
		s := types.PaymentStatus(st)
		status = &s
	}

	var method *types.PaymentMethod
	if m := c.QueryParam("method"); m != "" {
		pm := types.PaymentMethod(m)
		method = &pm
	}

	filter := dtos.PaymentFilterQuery{
		SaleID:     saleID,
		CustomerID: customerID,
		Status:     status,
		Method:     method,
		Search:     c.QueryParam("q"),
		Page:       params.Page,
		PageSize:   params.PageSize,
	}

	list, meta, err := ctrl.service.List(c.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(c, "Listado de pagos obtenido", list, *meta)
}

// Verify POST /payments/:id/verify
func (ctrl *PaymentController) Verify(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	var req dtos.VerifyPaymentRequest
	_ = c.Bind(&req)

	actor := middlewares.GetActor(c)
	ip := c.RealIP()
	ua := c.Request().UserAgent()

	resp, err := ctrl.service.Verify(c.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Pago verificado e imputado exitosamente a cartera", resp)
}

// Void POST /payments/:id/void
func (ctrl *PaymentController) Void(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	var req dtos.VoidPaymentRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	ip := c.RealIP()
	ua := c.Request().UserAgent()

	if err := ctrl.service.Void(c.Request().Context(), actor, id, req, ip, ua); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Pago anulado correctamente", nil)
}

