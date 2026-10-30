package controllers

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/notifications/services"

	"github.com/labstack/echo/v4"
)

type NotificationController struct {
	service *services.NotificationService
}

func NewNotificationController(service *services.NotificationService) *NotificationController {
	return &NotificationController{service: service}
}

// List GET /notifications
func (ctrl *NotificationController) List(c echo.Context) error {
	actor := middlewares.GetActor(c)
	params := utils.ParsePagination(c)
	unreadOnly := c.QueryParam("unread") == "true"

	resp, meta, err := ctrl.service.List(c.Request().Context(), actor, unreadOnly, params)
	if err != nil {
		return err
	}

	return utils.RespondPaginated(c, "Notificaciones recuperadas", resp, *meta)
}

// MarkAsRead POST /notifications/:id/read
func (ctrl *NotificationController) MarkAsRead(c echo.Context) error {
	id, err := utils.ParamInt64(c, "id")
	if err != nil {
		return err
	}

	actor := middlewares.GetActor(c)
	if err := ctrl.service.MarkAsRead(c.Request().Context(), actor, id); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Notificación marcada como leída", nil)
}

// MarkAllAsRead POST /notifications/read-all
func (ctrl *NotificationController) MarkAllAsRead(c echo.Context) error {
	actor := middlewares.GetActor(c)
	if err := ctrl.service.MarkAllAsRead(c.Request().Context(), actor); err != nil {
		return err
	}

	return utils.RespondOK[any](c, "Todas las notificaciones fueron marcadas como leídas", nil)
}

