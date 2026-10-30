package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/bank_statements/dtos"
	"importadoraApi/src/features/bank_statements/services"

	"github.com/labstack/echo/v4"
)

type BankStatementController struct {
	service *services.BankStatementService
}

func NewBankStatementController(service *services.BankStatementService) *BankStatementController {
	return &BankStatementController{service: service}
}

// UploadPDF POST /bank-statements/upload-pdf
func (c *BankStatementController) UploadPDF(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	file, err := ctx.FormFile("file")
	if err != nil {
		return utils.BadRequest("FILE_REQUIRED", "Debe adjuntar un archivo PDF con la clave 'file'.")
	}

	src, err := file.Open()
	if err != nil {
		return utils.Internal("No se pudo leer el archivo adjunto.", err)
	}
	defer src.Close()

	companyID := int64(1)
	if actor.CompanyID != nil {
		companyID = *actor.CompanyID
	}

	res, err := c.service.ProcessPDFUpload(ctx.Request().Context(), companyID, src, file.Size)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Extracto bancario procesado y cargado exitosamente", res)
}

// ListRecords GET /bank-statements/records
func (c *BankStatementController) ListRecords(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	filter := dtos.BankStatementFilterQuery{
		Description:   ctx.QueryParam("description"),
		BranchChannel: ctx.QueryParam("channel"),
		DateFrom:      ctx.QueryParam("from"),
		DateTo:        ctx.QueryParam("to"),
		Status:        ctx.QueryParam("status"),
		Page:          params.Page,
		PageSize:      params.PageSize,
	}

	items, meta, err := c.service.ListRecords(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Registros de extractos bancarios obtenidos", items, *meta)
}

// ConfirmRecord PATCH /bank-statements/records/:id/confirm
func (c *BankStatementController) ConfirmRecord(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.ConfirmBankRecordRequest
	_ = ctx.Bind(&req)

	res, err := c.service.ConfirmRecord(ctx.Request().Context(), actor, id, req)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Movimiento bancario confirmado exitosamente", res)
}

// IgnoreRecord PATCH /bank-statements/records/:id/ignore
func (c *BankStatementController) IgnoreRecord(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var body struct {
		Notes *string `json:"notes"`
	}
	_ = ctx.Bind(&body)

	err = c.service.IgnoreRecord(ctx.Request().Context(), actor, id, body.Notes)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Movimiento bancario marcado como ignorado", map[string]any{"id": id, "status": "ignored"})
}
