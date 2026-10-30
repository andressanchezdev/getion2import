package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/reports/services"

	"github.com/labstack/echo/v4"
)

type ReportController struct {
	service *services.ReportService
}

func NewReportController(service *services.ReportService) *ReportController {
	return &ReportController{service: service}
}

// GetSalesReport GET /reports/sales
func (ctrl *ReportController) GetSalesReport(c echo.Context) error {
	actor := middlewares.GetActor(c)
	resp, err := ctrl.service.GetSalesReport(c.Request().Context(), actor)
	if err != nil {
		return err
	}
	return utils.RespondOK(c, "Métricas de ventas obtenidas", resp)
}

// GetInventoryReport GET /reports/inventory
func (ctrl *ReportController) GetInventoryReport(c echo.Context) error {
	actor := middlewares.GetActor(c)
	resp, err := ctrl.service.GetInventoryReport(c.Request().Context(), actor)
	if err != nil {
		return err
	}
	return utils.RespondOK(c, "Métricas de inventario valorizado obtenidas", resp)
}

// GetWalletReport GET /reports/wallet
func (ctrl *ReportController) GetWalletReport(c echo.Context) error {
	actor := middlewares.GetActor(c)
	resp, err := ctrl.service.GetWalletReport(c.Request().Context(), actor)
	if err != nil {
		return err
	}
	return utils.RespondOK(c, "Métricas de cartera y saldos a favor obtenidas", resp)
}

