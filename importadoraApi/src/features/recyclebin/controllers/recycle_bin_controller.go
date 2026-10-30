package controllers

import (
	"strconv"

	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/recyclebin/dtos"
	"importadoraApi/src/features/recyclebin/services"

	"github.com/labstack/echo/v4"
)

type RecycleBinController struct {
	service *services.RecycleBinService
}

func NewRecycleBinController(service *services.RecycleBinService) *RecycleBinController {
	return &RecycleBinController{service: service}
}

// List GET /recycle-bin
func (ctrl *RecycleBinController) List(c echo.Context) error {
	actor := middlewares.GetActor(c)
	params := utils.ParsePagination(c)

	var isRestored *bool
	if rStr := c.QueryParam("isRestored"); rStr != "" {
		b, err := strconv.ParseBool(rStr)
		if err == nil {
			isRestored = &b
		}
	}

	filter := dtos.RecycleBinFilterQuery{
		EntityTable: c.QueryParam("table"),
		IsRestored:  isRestored,
		Search:      c.QueryParam("q"),
		Page:        params.Page,
		PageSize:    params.PageSize,
	}

	list, meta, err := ctrl.service.List(c.Request().Context(), actor, filter)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(c, "Elementos de papelera de reciclaje obtenidos", list, *meta)
}

// Restore POST /recycle-bin/:id/restore
func (ctrl *RecycleBinController) Restore(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	ip := c.RealIP()
	ua := c.Request().UserAgent()

	if err := ctrl.service.Restore(c.Request().Context(), actor, id, ip, ua); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Elemento restaurado exitosamente", nil)
}

