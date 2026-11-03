package controllers

// customer_document_renew_controller · controlador HTTP de la renovación de documentos del cliente y de sus alertas de vencimiento
// conecta con: los services y dtos de clientes y core/utils (respuestas y errores); los registra routes

import (
	"io"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
)

// DocumentAlerts GET /customers/documents/alerts
func (c *CustomerController) DocumentAlerts(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	alerts, err := c.service.ListDocumentAlerts(ctx.Request().Context(), actor)
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Documentos vencidos o por vencer obtenidos", alerts)
}

// RenewDocument POST /customers/:id/documents/:docId/renew (multipart/form-data; el archivo y las notas son opcionales)
func (c *CustomerController) RenewDocument(ctx echo.Context) error {
	actor := middlewares.GetActor(ctx)
	id, err := utils.ParamInt64(ctx, "id")
	if err != nil {
		return err
	}
	docID, err := utils.ParamInt64(ctx, "docId")
	if err != nil {
		return err
	}

	var notes *string
	if n := ctx.FormValue("notes"); n != "" {
		notes = &n
	}

	var fileBytes []byte
	fileName, mimeType := "", ""
	if fileHeader, err := ctx.FormFile("file"); err == nil {
		src, err := fileHeader.Open()
		if err != nil {
			return utils.Internal("Error al abrir archivo recibido.", err)
		}
		defer src.Close()
		if fileBytes, err = io.ReadAll(src); err != nil {
			return utils.Internal("Error al leer contenido del archivo.", err)
		}
		fileName = fileHeader.Filename
		if mimeType = fileHeader.Header.Get("Content-Type"); mimeType == "" {
			mimeType = "application/octet-stream"
		}
	}

	res, err := c.service.RenewDocument(ctx.Request().Context(), actor, id, docID, notes, fileName, mimeType, fileBytes, utils.EchoClientIP(ctx), ctx.Request().UserAgent())
	if err != nil {
		return err
	}
	return utils.RespondOK(ctx, "Documento renovado exitosamente", res)
}
