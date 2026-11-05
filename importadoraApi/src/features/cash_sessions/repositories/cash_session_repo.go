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

func (r *CashSessionRepository) FindActiveByWarehouse(ctx context.Context, q db.DBExecutor, companyID, warehouseID int64) (*CashSessionEntity, error) {
	const sql = `
		SELECT
			cs.id, cs.company_id, cs.warehouse_id, COALESCE(w.name, ''),
			cs.status, cs.opened_by_actor_type, cs.opened_by_actor_id, cs.opened_by_name,
			cs.opened_at, cs.opening_amount, cs.closed_by_actor_type, cs.closed_by_actor_id,
			cs.closed_by_name, cs.closed_at, cs.cash_total, cs.transfer_total,
			cs.payments_count, cs.expected_cash, cs.counted_cash, cs.difference, cs.notes
		FROM cash_sessions cs
		LEFT JOIN warehouses w ON cs.warehouse_id = w.id
		WHERE cs.company_id = $1 AND cs.warehouse_id = $2 AND cs.status = 'open'
		LIMIT 1
	`
	var s CashSessionEntity
	err := q.QueryRow(ctx, sql, companyID, warehouseID).Scan(
		&s.ID, &s.CompanyID, &s.WarehouseID, &s.WarehouseName,
		&s.Status, &s.OpenedByActorType, &s.OpenedByActorID, &s.OpenedByName,
		&s.OpenedAt, &s.OpeningAmount, &s.ClosedByActorType, &s.ClosedByActorID,
		&s.ClosedByName, &s.ClosedAt, &s.CashTotal, &s.TransferTotal,
		&s.PaymentsCount, &s.ExpectedCash, &s.CountedCash, &s.Difference, &s.Notes,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || isMissingSchemaElement(err) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
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
			notes = $10
		WHERE id = $11
		RETURNING closed_at
	`
	var closedAt time.Time
	err := q.QueryRow(
		ctx, sql,
		s.ClosedByActorType, s.ClosedByActorID, s.ClosedByName,
		s.CashTotal, s.TransferTotal, s.PaymentsCount,
		s.ExpectedCash, s.CountedCash, s.Difference, s.Notes,
		s.ID,
	).Scan(&closedAt)
	if err != nil {
		return err
	}
	s.Status = "closed"
	s.ClosedAt = &closedAt
	return nil
}

// SessionTotals suma lo recibido en un turno: efectivo verificado, transferencias recibidas (verificadas o en revisión) y cuántos pagos hubo.
// ojo: los pagos se ligan al turno abierto de la bodega de la venta cuando se crean (payments.cash_session_id); los anulados no cuentan
func (r *CashSessionRepository) SessionTotals(ctx context.Context, q db.DBExecutor, sessionID int64) (cashTotal float64, transferTotal float64, count int, err error) {
	const sql = `
		SELECT
			COALESCE(SUM(amount) FILTER (WHERE method = 'cash' AND status = 'verified'), 0),
			COALESCE(SUM(amount) FILTER (WHERE method = 'transfer' AND status <> 'voided'), 0),
			COUNT(*) FILTER (WHERE status <> 'voided')
		FROM payments
		WHERE cash_session_id = $1
	`
	err = q.QueryRow(ctx, sql, sessionID).Scan(&cashTotal, &transferTotal, &count)
	if err != nil && isMissingSchemaElement(err) {
		return 0, 0, 0, nil
	}
	return
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

// ListExpenses lista los gastos de un turno en el orden en que se declararon.
func (r *CashSessionRepository) ListExpenses(ctx context.Context, q db.DBExecutor, sessionID int64) ([]CashExpenseEntity, error) {
	const sql = `
		SELECT COALESCE(receipt_number, ''), concept, cash_amount, transfer_amount
		FROM cash_session_expenses
		WHERE cash_session_id = $1
		ORDER BY id ASC
	`
	rows, err := q.Query(ctx, sql, sessionID)
	if err != nil {
		if isMissingSchemaElement(err) {
			return []CashExpenseEntity{}, nil
		}
		return nil, err
	}
	defer rows.Close()

	items := make([]CashExpenseEntity, 0)
	for rows.Next() {
		var e CashExpenseEntity
		if err := rows.Scan(&e.ReceiptNumber, &e.Concept, &e.CashAmount, &e.TransferAmount); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	return items, rows.Err()
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

// ResolveActorName obtiene el nombre completo del actor (empleado o administrador) por su ID.
func (r *CashSessionRepository) ResolveActorName(ctx context.Context, q db.DBExecutor, table string, actorID int64) (string, error) {
	var firstName, lastName string
	query := "SELECT first_name, COALESCE(last_name, '') FROM employees WHERE id = $1"
	if table == "admins" {
		query = "SELECT first_name, COALESCE(last_name, '') FROM admins WHERE id = $1"
	}
	err := q.QueryRow(ctx, query, actorID).Scan(&firstName, &lastName)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(firstName + " " + lastName), nil
}
