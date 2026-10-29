package controllers

import (
	"io"
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/customers/dtos"
	"importadoraApi/src/features/customers/services"

	"github.com/labstack/echo/v4"
)

type CustomerController struct {
	service *services.CustomerService
}

func NewCustomerController(service *services.CustomerService) *CustomerController {
	return &CustomerController{service: service}
}

// Create POST /customers
func (c *CustomerController) Create(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)

	var req dtos.CreateCustomerRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Create(ctx.Request().Context(), actor, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Cliente creado exitosamente", res)
}

// Get GET /customers
func (c *CustomerController) Get(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	params := utils.ParsePagination(ctx)

	var companyID *int64
	if cidStr := ctx.QueryParam("companyId"); cidStr != "" {
		if cid, err := strconv.ParseInt(cidStr, 10, 64); err == nil {
			companyID = &cid
		}
	}

	var status *types.CustomerStatus
	if st := ctx.QueryParam("status"); st != "" {
		parsed := types.CustomerStatus(st)
		status = &parsed
	}

	var creditEnabled *bool
	if ce := ctx.QueryParam("creditEnabled"); ce != "" {
		b := ce == "true" || ce == "1"
		creditEnabled = &b
	}

	var priceTier *types.PriceTier
	if pt := ctx.QueryParam("priceTier"); pt != "" {
		parsed := types.PriceTier(pt)
		priceTier = &parsed
	}

	filter := dtos.CustomerFilterQuery{
		CompanyID:     companyID,
		Status:        status,
		CreditEnabled: creditEnabled,
		PriceTier:     priceTier,
		Search:        ctx.QueryParam("q"),
		Page:          params.Page,
		PageSize:      params.PageSize,
	}

	items, meta, err := c.service.List(ctx.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Listado de clientes obtenido", items, *meta)
}

// Search GET /customers/search
func (c *CustomerController) Search(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	query := ctx.QueryParam("q")
	params := utils.ParsePagination(ctx)

	items, meta, err := c.service.Search(ctx.Request().Context(), actor, query, params)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(ctx, "Resultados de búsqueda de clientes", items, *meta)
}

// GetByID GET /customers/:id
func (c *CustomerController) GetByID(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	res, err := c.service.GetByID(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Detalle de cliente obtenido", res)
}

// Update PUT /customers/:id
func (c *CustomerController) Update(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	var req dtos.UpdateCustomerRequest
	if err := utils.BindJSON(ctx, &req); err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.Update(ctx.Request().Context(), actor, id, req, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Cliente actualizado exitosamente", res)
}

// Delete DELETE /customers/:id
func (c *CustomerController) Delete(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.Delete(ctx.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}

	return utils.RespondNoContent(ctx)
}

// ListDocuments GET /customers/:id/documents
func (c *CustomerController) ListDocuments(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	docs, err := c.service.ListDocuments(ctx.Request().Context(), actor, id)
	if err != nil {
		return err
	}

	return utils.RespondOK(ctx, "Documentos del cliente obtenidos", docs)
}

// UploadDocument POST /customers/:id/documents (multipart/form-data)
func (c *CustomerController) UploadDocument(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	docTypeStr := ctx.FormValue("docType")
	if docTypeStr == "" {
		docTypeStr = "other"
	}
	docType := types.CustomerDocType(docTypeStr)

	var notes *string
	if n := ctx.FormValue("notes"); n != "" {
		notes = &n
	}

	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		return utils.BadRequest("MISSING_FILE", "El archivo 'file' es requerido en el formulario multipart.")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return utils.Internal("Error al abrir archivo recibido.", err)
	}
	defer src.Close()

	fileBytes, err := io.ReadAll(src)
	if err != nil {
		return utils.Internal("Error al leer contenido del archivo.", err)
	}

	mimeType := fileHeader.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	res, err := c.service.UploadDocument(ctx.Request().Context(), actor, id, docType, notes, fileHeader.Filename, mimeType, fileBytes, ip, ua)
	if err != nil {
		return err
	}

	return utils.RespondCreated(ctx, "Documento adjunto subido exitosamente", res)
}

// DeleteDocument DELETE /customers/:id/documents/:docId
func (c *CustomerController) DeleteDocument(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}

	docID, err := utils.ParamInt64(ctx, "docId")
	if err != nil {
		return err
	}

	ip := utils.EchoClientIP(ctx)
	ua := ctx.Request().UserAgent()

	if err := c.service.DeleteDocument(ctx.Request().Context(), actor, id, docID, ip, ua); err != nil {
		return err
	}

	return utils.RespondNoContent(ctx)
}

