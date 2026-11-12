package controllers

// realtime_controller.go · controlador HTTP del tiempo real: recibe la petición y llama al servicio; no tiene lógica de negocio
// conecta con: ticket_service y core/utils (respuestas); lo registra realtime_routes

import (
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/utils"
	"importadoraApi/src/features/realtime/services"

	"github.com/labstack/echo/v4"
)

// RealtimeController atiende las rutas /realtime.
type RealtimeController struct {
	tickets *services.TicketService
}

// NewRealtimeController crea el controlador.
func NewRealtimeController(tickets *services.TicketService) *RealtimeController {
	return &RealtimeController{tickets: tickets}
}

// IssueTicket POST /realtime/ticket · ticket de un solo uso para abrir el websocket
func (c *RealtimeController) IssueTicket(ctx echo.Context) error {
	res, err := c.tickets.Issue(ctx.Request().Context(), middlewares.GetActor(ctx))
	if err != nil {
		return err
	}
	return utils.RespondCreated(ctx, "Ticket de tiempo real emitido", res)
}
