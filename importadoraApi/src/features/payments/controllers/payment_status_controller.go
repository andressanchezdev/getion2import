package controllers

// payment_status_controller.go · controlador HTTP de los cambios de estado de un pago que no son verificar ni anular: rechazar y reabrir; no tiene lógica de negocio
// conecta con: el service y los dtos de pagos y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/payments/dtos"

	"github.com/labstack/echo/v4"
)

// Reject POST /payments/:id/reject
func (ctrl *PaymentController) Reject(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}
	var req dtos.RejectPaymentRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}
	resp, err := ctrl.service.Reject(c.Request().Context(), middlewares.GetActor(c), id, req, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		return err
	}
	return utils.RespondOK(c, "Pago rechazado", resp)
}

// Reopen POST /payments/:id/reopen
func (ctrl *PaymentController) Reopen(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}
	resp, err := ctrl.service.Reopen(c.Request().Context(), middlewares.GetActor(c), id, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		return err
	}
	return utils.RespondOK(c, "Pago devuelto a revisión", resp)
}
