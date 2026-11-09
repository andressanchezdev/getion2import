package controllers

// invoice_annul_controller · POST /invoices/:id/annul
// conecta con: SaleService.AnnulInvoice; el motivo (10 a 100 caracteres) viaja en el cuerpo

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
)

// AnnulInvoice POST /invoices/:id/annul
func (ctrl *SaleController) AnnulInvoice(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}
	companyID, err := middlewares.EffectiveCompanyID(c)
	if err != nil {
		return err
	}
	var req struct {
		Reason string `json:"reason"`
	}
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}

	if err := ctrl.saleService.AnnulInvoice(c.Request().Context(), middlewares.GetActor(c), companyID, id, req.Reason, utils.EchoClientIP(c), c.Request().UserAgent()); err != nil {
		return err
	}
	return utils.RespondOK[any](c, "Factura anulada", nil)
}
