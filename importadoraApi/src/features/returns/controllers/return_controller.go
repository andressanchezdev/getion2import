package controllers

// return_controller.go · controlador HTTP de devoluciones: recibe la petición, valida la entrada y llama al servicio; no tiene lógica de negocio
// conecta con: los services y dtos de devoluciones y core/utils (respuestas y errores); los registra routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/returns/dtos"
	"importadoraApi/src/features/returns/services"

	"github.com/labstack/echo/v4"
)

type ReturnController struct {
	returnService *services.ReturnService
}

// NewReturnController crea el controlador con las piezas que necesita para funcionar.
func NewReturnController(returnService *services.ReturnService) *ReturnController {
	return &ReturnController{returnService: returnService}
}

// Create POST /returns
func (ctrl *ReturnController) Create(c echo.Context) error {
	var req dtos.CreateReturnRequest
	if err := utils.BindJSON(c, &req); err != nil {
		return err
	}

	companyID, _ := middlewares.EffectiveCompanyID(c)
	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	ret, err := ctrl.returnService.Create(c.Request().Context(), &companyID, empID, req)
	if err != nil {
		return err
	}

	return utils.RespondCreated(c, "Solicitud de devolución registrada exitosamente", ret)
}

// FindByID GET /returns/:id
func (ctrl *ReturnController) FindByID(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	ret, err := ctrl.returnService.FindByID(c.Request().Context(), id)
	if err != nil {
		return err
	}

	return utils.RespondOK(c, "Devolución recuperada", ret)
}

// List GET /returns
func (ctrl *ReturnController) List(c echo.Context) error {
	var f dtos.ReturnFilterQuery

	companyID, err := middlewares.EffectiveCompanyID(c)
	if err == nil && companyID > 0 {
		f.CompanyID = &companyID
	}

	if sid := c.QueryParam("saleId"); sid != "" {
		if id, err := utils.ParamInt64(c, "saleId"); err == nil {
			f.SaleID = &id
		}
	}

	if cid := c.QueryParam("customerId"); cid != "" {
		if id, err := utils.ParamInt64(c, "customerId"); err == nil {
			f.CustomerID = &id
		}
	}

	if wid := c.QueryParam("warehouseId"); wid != "" {
		if id, err := utils.ParamInt64(c, "warehouseId"); err == nil {
			f.WarehouseID = &id
		}
	}

	if st := c.QueryParam("status"); st != "" {
		s := types.ReturnStatus(st)
		f.Status = &s
	}

	pg := utils.ParsePagination(c)
	f.Page = pg.Page
	f.PageSize = pg.PageSize

	returns, total, err := ctrl.returnService.List(c.Request().Context(), f)
	if err != nil {
		return err
	}

	meta := utils.BuildMeta(pg.Page, pg.PageSize, total)
	return utils.RespondPaginated(c, "Listado de devoluciones", returns, meta)
}

// Approve POST /returns/:id/approve
func (ctrl *ReturnController) Approve(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	if err := ctrl.returnService.Approve(c.Request().Context(), id, empID); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Devolución aprobada exitosamente y stock reintegrado", nil)
}

// Reject POST /returns/:id/reject
func (ctrl *ReturnController) Reject(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	empID := int64(1)
	if actor != nil && actor.ActorID > 0 {
		empID = actor.ActorID
	}

	if err := ctrl.returnService.Reject(c.Request().Context(), id, empID); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Devolución rechazada exitosamente", nil)
}
