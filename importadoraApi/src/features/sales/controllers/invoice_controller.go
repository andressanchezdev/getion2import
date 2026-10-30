package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/sales/dtos"

	"github.com/labstack/echo/v4"
)

// FindInvoiceByID GET /invoices/:id
func (ctrl *SaleController) FindInvoiceByID(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	inv, err := ctrl.saleService.FindInvoiceByID(c.Request().Context(), id)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Factura recuperada", inv)
}

// ListInvoices GET /invoices
func (ctrl *SaleController) ListInvoices(c echo.Context) error {
	var f dtos.InvoiceFilterQuery

	companyID, err := middlewares.EffectiveCompanyID(c)
	if err == nil && companyID > 0 {
		f.CompanyID = &companyID
	}

	if wid := c.QueryParam("warehouseId"); wid != "" {
		if id, err := strconv.ParseInt(wid, 10, 64); err == nil {
			f.WarehouseID = &id
		}
	}

	if sid := c.QueryParam("saleId"); sid != "" {
		if id, err := strconv.ParseInt(sid, 10, 64); err == nil {
			f.SaleID = &id
		}
	}

	if st := c.QueryParam("status"); st != "" {
		s := types.InvoiceStatus(st)
		f.Status = &s
	}

	if kd := c.QueryParam("kind"); kd != "" {
		k := types.InvoiceKind(kd)
		f.Kind = &k
	}

	pg := utils.ParsePagination(c)
	f.Page = pg.Page
	f.PageSize = pg.PageSize

	list, total, err := ctrl.saleService.ListInvoices(c.Request().Context(), f)
	if err != nil {
		return err
	}

	meta := utils.BuildMeta(pg.Page, pg.PageSize, total)
	return utils.RespondPaginated(c, "Listado de facturas", list, meta)
}

