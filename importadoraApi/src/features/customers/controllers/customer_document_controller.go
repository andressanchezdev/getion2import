package controllers

import (
	"io"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
)

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

