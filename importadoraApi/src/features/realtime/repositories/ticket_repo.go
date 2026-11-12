package repositories

// ticket_repo.go · guarda tickets del websocket en realtime_tickets (solo el sha256; el ticket en claro nunca se guarda)
// conecta con: ticket_service (lo usa) y la migración 20261129_realtime.sql (tabla); importadoraRealtime los consume con UPDATE … used_at

import (
	"context"
	"time"

	"importadoraApi/src/core/db"
)

// TicketRecord es una fila de realtime_tickets.
type TicketRecord struct {
	Hash        string // sha256 hex del ticket
	ActorType   string
	ActorID     int64
	CompanyID   *int64
	WarehouseID *int64
	SessionID   int64
	ExpiresAt   time.Time
}

// TicketRepository escribe en realtime_tickets.
type TicketRepository struct{}

// NewTicketRepository crea el repositorio.
func NewTicketRepository() *TicketRepository { return &TicketRepository{} }

// Insert guarda el ticket nuevo.
func (r *TicketRepository) Insert(ctx context.Context, q db.DBExecutor, t TicketRecord) error {
	_, err := q.Exec(ctx, `
		INSERT INTO realtime_tickets (ticket_hash, actor_type, actor_id, company_id, warehouse_id, session_id, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		t.Hash, t.ActorType, t.ActorID, t.CompanyID, t.WarehouseID, t.SessionID, t.ExpiresAt)
	return err
}
