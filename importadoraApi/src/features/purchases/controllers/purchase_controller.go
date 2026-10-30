package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/purchases/dtos"
	"importadoraApi/src/features/purchases/services"

	"github.com/labstack/echo/v4"
)

type PurchaseController struct {
	service *services.PurchaseService
}

func NewPurchaseController(service *services.PurchaseService) *PurchaseController {
	return &PurchaseController{service: service}
}

// Create POST /purchases
func (ctrl *PurchaseController) Create(c echo.Context) error {
	var req dtos.CreatePurchaseRequest
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

	return utils.RespondCreated(c, "Orden de compra generada exitosamente", resp)
}

// FindByID GET /purchases/:id
func (ctrl *PurchaseController) FindByID(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	resp, err := ctrl.service.FindByID(c.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Detalle de orden de compra obtenido", resp)
}

// List GET /purchases
func (ctrl *PurchaseController) List(c echo.Context) error {
	actor := middlewares.GetActor(c)
	params := utils.ParsePagination(c)

	var supplierID *int64
	if sidStr := c.QueryParam("supplierId"); sidStr != "" {
		if sid, err := strconv.ParseInt(sidStr, 10, 64); err == nil {
			supplierID = &sid
		}
	}

	var warehouseID *int64
	if widStr := c.QueryParam("warehouseId"); widStr != "" {
		if wid, err := strconv.ParseInt(widStr, 10, 64); err == nil {
			warehouseID = &wid
		}
	}

	var status *types.PurchaseStatus
	if st := c.QueryParam("status"); st != "" {
		ps := types.PurchaseStatus(st)
		status = &ps
	}

	filter := dtos.PurchaseFilterQuery{
		SupplierID:  supplierID,
		WarehouseID: warehouseID,
		Status:      status,
		Search:      c.QueryParam("q"),
		Page:        params.Page,
		PageSize:    params.PageSize,
	}

	list, meta, err := ctrl.service.List(c.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(c, "Listado de órdenes de compra obtenido", list, *meta)
}

// ExportExcel GET /purchases/:id/export/excel
func (ctrl *PurchaseController) ExportExcel(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	fileBytes, filename, err := ctrl.service.ExportExcel(c.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, fmt.Sprintf("attachment; filename=%q", filename))
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileBytes)
}

// Receive POST /purchases/:id/receive
func (ctrl *PurchaseController) Receive(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	var req dtos.ReceivePurchaseRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	ip := c.RealIP()
	ua := c.Request().UserAgent()

	resp, err := ctrl.service.Receive(c.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Recepción de mercancía registrada exitosamente e ingresada a inventario", resp)
}

// Void POST /purchases/:id/void
func (ctrl *PurchaseController) Void(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	ip := c.RealIP()
	ua := c.Request().UserAgent()

	if err := ctrl.service.Void(c.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Orden de compra anulada correctamente", nil)
}

// UploadSupplierCatalog POST /purchases/suppliers/:supplierId/catalog/upload
func (ctrl *PurchaseController) UploadSupplierCatalog(c echo.Context) error {
	supplierID, err := utils.ParamInt64(c, "supplierId")
	if err != nil {
		return err
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return utils.BadRequest("MISSING_FILE", "Debe adjuntar un archivo Excel (.xlsx) con el campo 'file'.")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return utils.Internal("Error al abrir archivo recibido.", err)
	}
	defer src.Close()

	actor := middlewares.GetActor(c)
	resp, err := ctrl.service.UploadSupplierCatalogExcel(c.Request().Context(), actor, supplierID, src, fileHeader.Filename)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Catálogo de proveedor procesado y sincronizado con éxito", resp)
}

// ListSupplierProducts GET /purchases/suppliers/:supplierId/products
func (ctrl *PurchaseController) ListSupplierProducts(c echo.Context) error {
	supplierID, err := utils.ParamInt64(c, "supplierId")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	products, err := ctrl.service.ListSupplierProducts(c.Request().Context(), actor, supplierID)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Catálogo de repuestos del proveedor obtenido", products)
}

