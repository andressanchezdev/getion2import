package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/wallet/dtos"
	"importadoraApi/src/features/wallet/services"

	"github.com/labstack/echo/v4"
)

type WalletController struct {
	service *services.WalletService
}

func NewWalletController(service *services.WalletService) *WalletController {
	return &WalletController{service: service}
}

// GetCustomerSummary GET /wallet/summary/:customerId
func (ctrl *WalletController) GetCustomerSummary(c echo.Context) error {
	customerID, err := utils.ParamInt64(c, "customerId")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	summary, err := ctrl.service.GetCustomerSummary(c.Request().Context(), actor, customerID)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Estado y cupo de crédito obtenido", summary)
}

// ListEntries GET /wallet/entries
func (ctrl *WalletController) ListEntries(c echo.Context) error {
	actor := middlewares.GetActor(c)
	params := utils.ParsePagination(c)

	var customerID *int64
	if cidStr := c.QueryParam("customerId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			customerID = &cid
		}
	}

	var entryType *types.CreditEntryType
	if et := c.QueryParam("entryType"); et != "" {
		t := types.CreditEntryType(et)
		entryType = &t
	}

	filter := dtos.CreditEntryFilterQuery{
		CustomerID: customerID,
		EntryType:  entryType,
		Page:       params.Page,
		PageSize:   params.PageSize,
	}

	list, meta, err := ctrl.service.ListEntries(c.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(c, "Historial de movimientos de crédito obtenido", list, *meta)
}

// CreateAdjustment POST /wallet/adjust
func (ctrl *WalletController) CreateAdjustment(c echo.Context) error {
	var req dtos.CreateCreditAdjustmentRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	ip := c.RealIP()
	ua := c.Request().UserAgent()

	summary, err := ctrl.service.CreateAdjustment(c.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Ajuste contable de crédito aplicado con éxito", summary)
}

