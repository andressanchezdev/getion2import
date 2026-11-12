package dtos

// realtime_dto.go · respuesta de POST /realtime/ticket: el ticket de un solo uso y a dónde conectarse
// conecta con: ticket_service (la arma) y realtime_controller (la responde); la consume features/realtime del front

import "time"

// TicketResponse es lo que el front necesita para abrir el websocket: ticket, wsUrl y vencimiento.
// ojo: el front abre wsUrl?ticket=… (el WebSocket del navegador no admite cabeceras); sirve una sola vez y vence en segundos,
// así que no expone la sesión. El token de sesión (JWT) nunca va en la URL
type TicketResponse struct {
	Ticket    string    `json:"ticket"`
	WsURL     string    `json:"wsUrl"`
	ExpiresAt time.Time `json:"expiresAt"`
}
