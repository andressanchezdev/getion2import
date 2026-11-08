package repositories

// cash_session_repo.go · todo el SQL de turnos de caja, gastos y totales cobrados
// conecta con: cash_session_service; ojo: los pagos anulados (voided) no suman al total

import (
	"context"
	"errors"
	"strings"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func isMissingSchemaElement(err error) bool {
	if err == nil {
		return false
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "42703" || pgErr.Code == "42P01"
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "does not exist") || strings.Contains(msg, "column")
}

type CashSessionEntity struct {
	ID                int64
	CompanyID         int64
	WarehouseID       int64
	WarehouseName     string
	Status            string
	OpenedByActorType string
	OpenedByActorID   int64
	OpenedByName      string
	OpenedAt          time.Time
	OpeningAmount     float64
	ClosedByActorType *string
	ClosedByActorID   *int64
	ClosedByName      *string
	ClosedAt          *time.Time
	CashTotal         *float64
	TransferTotal     *float64
	AbonosTotal       *float64 // pagos de ventas a crédito recibidos en el turno
	CountedTransfer   *float64 // transferencias que el cajero declara al cerrar
	CountedAbonos     *float64 // abonos que el cajero declara al cerrar
	PaymentsCount     *int
	ExpectedCash      *float64
	CountedCash       *float64
	Difference        *float64
	Notes             *string
}

type CashSessionRepository struct{}

func NewCashSessionRepository() *CashSessionRepository {
	return &CashSessionRepository{}
}

func (r *CashSessionRepository) FindActiveByActor(ctx context.Context, q db.DBExecutor, companyID, warehouseID int64, actorType string, actorID int64) (*CashSessionEntity, error) {
	const sql = `
		SELECT
			cs.id, cs.company_id, cs.warehouse_id, COALESCE(w.name, ''),
			cs.status, cs.opened_by_actor_type, cs.opened_by_actor_id, cs.opened_by_name,
			cs.opened_at, cs.opening_amount, cs.closed_by_actor_type, cs.closed_by_actor_id,
			cs.closed_by_name, cs.closed_at, cs.cash_total, cs.transfer_total,
			cs.payments_count, cs.expected_cash, cs.counted_cash, cs.difference, cs.notes,
			cs.abonos_total, cs.counted_transfer, cs.counted_abonos
		FROM cash_sessions cs
		LEFT JOIN warehouses w ON cs.warehouse_id = w.id
		WHERE cs.company_id = $1 AND cs.warehouse_id = $2 
		  AND cs.opened_by_actor_type = $3 AND cs.opened_by_actor_id = $4 
		  AND cs.status = 'open'
		LIMIT 1
	`
	var s CashSessionEntity
	err := q.QueryRow(ctx, sql, companyID, warehouseID, actorType, actorID).Scan(
		&s.ID, &s.CompanyID, &s.WarehouseID, &s.WarehouseName,
		&s.Status, &s.OpenedByActorType, &s.OpenedByActorID, &s.OpenedByName,
		&s.OpenedAt, &s.OpeningAmount, &s.ClosedByActorType, &s.ClosedByActorID,
		&s.ClosedByName, &s.ClosedAt, &s.CashTotal, &s.TransferTotal,
		&s.PaymentsCount, &s.ExpectedCash, &s.CountedCash, &s.Difference, &s.Notes,
		&s.AbonosTotal, &s.CountedTransfer, &s.CountedAbonos,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || isMissingSchemaElement(err) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// CountPendingVerificationSales cuenta los pedidos pendientes de verificación en la bodega.
func (r *CashSessionRepository) CountPendingVerificationSales(ctx context.Context, q db.DBExecutor, companyID, warehouseID int64) (int, error) {
	const sql = `
		SELECT COUNT(*)
		FROM sales
		WHERE company_id = $1 AND warehouse_id = $2 AND current_stage = 'verification' AND status = 'open'
	`
	var count int
	err := q.QueryRow(ctx, sql, companyID, warehouseID).Scan(&count)
	return count, err
}

func (r *CashSessionRepository) OpenSession(ctx context.Context, q db.DBExecutor, s *CashSessionEntity) (*CashSessionEntity, error) {
	const sql = `
		INSERT INTO cash_sessions (
			company_id, warehouse_id, status, opened_by_actor_type, opened_by_actor_id,
			opened_by_name, opened_at, opening_amount
		) VALUES ($1, $2, 'open', $3, $4, $5, CURRENT_TIMESTAMP, $6)
		RETURNING id, opened_at
	`
	err := q.QueryRow(
		ctx, sql,
		s.CompanyID, s.WarehouseID, s.OpenedByActorType, s.OpenedByActorID,
		s.OpenedByName, s.OpeningAmount,
	).Scan(&s.ID, &s.OpenedAt)
	if err != nil {
		return nil, err
	}
	s.Status = "open"
	return s, nil
}

func (r *CashSessionRepository) CloseSession(ctx context.Context, q db.DBExecutor, s *CashSessionEntity) error {
	const sql = `
		UPDATE cash_sessions
		SET
			status = 'closed',
			closed_by_actor_type = $1,
			closed_by_actor_id = $2,
			closed_by_name = $3,
			closed_at = CURRENT_TIMESTAMP,
			cash_total = $4,
			transfer_total = $5,
			payments_count = $6,
			expected_cash = $7,
			counted_cash = $8,
			difference = $9,
			notes = $10,
			abonos_total = $11,
			counted_transfer = $12,
			counted_abonos = $13
		WHERE id = $14
		RETURNING closed_at
	`
	var closedAt time.Time
	err := q.QueryRow(
		ctx, sql,
		s.ClosedByActorType, s.ClosedByActorID, s.ClosedByName,
		s.CashTotal, s.TransferTotal, s.PaymentsCount,
		s.ExpectedCash, s.CountedCash, s.Difference, s.Notes,
		s.AbonosTotal, s.CountedTransfer, s.CountedAbonos,
		s.ID,
	).Scan(&closedAt)
	if err != nil {
		return err
	}
	s.Status = "closed"
	s.ClosedAt = &closedAt
	return nil
}

// SessionSums es lo recibido en un turno, separado por tipo de venta: las de contado (efectivo y transferencia) y los abonos de ventas a crédito
type SessionSums struct {
	Cash       float64 // efectivo verificado de ventas de contado
	Transfer   float64 // transferencias de ventas de contado (verificadas o en revisión)
	Abonos     float64 // pagos de ventas a crédito (en cualquier método, sin los anulados)
	AbonosCash float64 // de los abonos, lo recibido en efectivo y verificado (entra a la gaveta)
	Count      int
}

// SessionTotals suma lo recibido en un turno; los pagos se ligan al turno abierto de la bodega de la venta cuando se crean (payments.cash_session_id) y los anulados no cuentan
func (r *CashSessionRepository) SessionTotals(ctx context.Context, q db.DBExecutor, sessionID int64) (SessionSums, error) {
	const sql = `
		SELECT
			COALESCE(SUM(p.amount) FILTER (WHERE s.payment_method <> 'credit' AND p.method = 'cash' AND p.status = 'verified'), 0),
			COALESCE(SUM(p.amount) FILTER (WHERE s.payment_method <> 'credit' AND p.method = 'transfer' AND p.status <> 'voided'), 0),
			COALESCE(SUM(p.amount) FILTER (WHERE s.payment_method = 'credit' AND p.status <> 'voided'), 0),
			COALESCE(SUM(p.amount) FILTER (WHERE s.payment_method = 'credit' AND p.method = 'cash' AND p.status = 'verified'), 0),
			COUNT(*) FILTER (WHERE p.status <> 'voided')
		FROM payments p
		JOIN sales s ON s.id = p.sale_id
		WHERE p.cash_session_id = $1
	`
	var sums SessionSums
	err := q.QueryRow(ctx, sql, sessionID).Scan(&sums.Cash, &sums.Transfer, &sums.Abonos, &sums.AbonosCash, &sums.Count)
	if err != nil && isMissingSchemaElement(err) {
		return SessionSums{}, nil
	}
	return sums, err
}

// CashExpenseEntity es un gasto menor pagado desde la caja durante el turno.
type CashExpenseEntity struct {
	ReceiptNumber  string
	Concept        string
	CashAmount     float64
	TransferAmount float64
}

// InsertExpense guarda un gasto del turno (se llama dentro de la transacción del cierre).
func (r *CashSessionRepository) InsertExpense(ctx context.Context, q db.DBExecutor, sessionID int64, e CashExpenseEntity) error {
	const sql = `
		INSERT INTO cash_session_expenses (cash_session_id, receipt_number, concept, cash_amount, transfer_amount)
		VALUES ($1, NULLIF($2, ''), $3, $4, $5)
	`
	_, err := q.Exec(ctx, sql, sessionID, e.ReceiptNumber, e.Concept, e.CashAmount, e.TransferAmount)
	return err
}

// FindWarehouseCompanyID obtiene el company_id de una bodega para asociar el turno de caja.
func (r *CashSessionRepository) FindWarehouseCompanyID(ctx context.Context, q db.DBExecutor, warehouseID int64) (int64, error) {
	var companyID int64
	err := q.QueryRow(ctx, "SELECT company_id FROM warehouses WHERE id = $1", warehouseID).Scan(&companyID)
	if err != nil {
		return 0, err
	}
	return companyID, nil
}
