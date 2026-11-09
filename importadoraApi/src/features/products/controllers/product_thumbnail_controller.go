package controllers

// product_thumbnail_controller.go · controlador HTTP de miniaturas de producto: lee los ids y llama al servicio; no tiene lógica de negocio
// conecta con: el service y los dtos de productos y core/utils (respuestas y errores); lo registra routes

import (
	"strconv"
	"strings"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"

	"github.com/labstack/echo/v4"
)

// Thumbnails GET /products/thumbnails?ids=1,2,3
func (ctrl *ProductController) Thumbnails(c echo.Context) error {
	var ids []int64
	for _, raw := range strings.Split(c.QueryParam("ids"), ",") {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || id <= 0 {
			return utils.BadRequest("INVALID_IDS", "Los ids deben ser números enteros positivos separados por coma.")
		}
		ids = append(ids, id)
	}

	items, err := ctrl.service.Thumbnails(c.Request().Context(), middlewares.GetActor(c), ids)
	if err != nil {
		return err
	}
	return utils.RespondOK(c, "Imágenes de productos obtenidas", items)
}
