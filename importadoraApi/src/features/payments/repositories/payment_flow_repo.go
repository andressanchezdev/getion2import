package repositories

// payment_flow_repo.go · lecturas del flujo de pago de un pedido: cuánto falta por cubrir, si hay pagos en revisión y si la bodega tiene turno de caja abierto
// conecta con: core/db (DBExecutor); lo usa payment_flow_service (pagos mixtos y paso automático de verificación)

import (
	"context"
	"errors"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

// SaleCoverage es lo que hace falta saber de un pedido para decidir si su pago ya quedó cubierto.
type SaleCoverage struct {
	CompanyID     int64
	WarehouseID   int64
	SerialCode    string
	CustomerID    *int64
	Status        string
	Stage         string
	PaymentMethod string
	Total         float64
	PaidTotal     float64 // pagos ya verificados
	CreditAmount  float64 // lo que el cliente dejó a crédito
	ReviewCount   int     // pagos todavía en revisión
	ReviewAmount  float64
}

// FindSaleCoverage lee el pedido y sus pagos en revisión (bloquea la fila del pedido: dos cobros a la vez no se pisan).
func (r *PaymentRepository) FindSaleCoverage(ctx context.Context, q db.DBExecutor, saleID int64) (*SaleCoverage, error) {
	const sql = `
		SELECT
			s.company_id, s.warehouse_id, s.serial_code, s.customer_id, s.status, s.current_stage, s.payment_method,
			s.total::float8, s.paid_total::float8, s.credit_amount::float8,
			COALESCE((SELECT COUNT(*) FROM payments p WHERE p.sale_id = s.id AND p.status = 'review'), 0)::int,
			COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.id AND p.status = 'review'), 0)::float8
		FROM sales s
		WHERE s.id = $1
		FOR UPDATE OF s
	`
	var c SaleCoverage
	err := q.QueryRow(ctx, sql, saleID).Scan(
		&c.CompanyID, &c.WarehouseID, &c.SerialCode, &c.CustomerID, &c.Status, &c.Stage, &c.PaymentMethod,
		&c.Total, &c.PaidTotal, &c.CreditAmount, &c.ReviewCount, &c.ReviewAmount,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// HasOpenCashSession dice si la bodega tiene un turno de caja abierto (hace falta para recibir efectivo).
func (r *PaymentRepository) HasOpenCashSession(ctx context.Context, q db.DBExecutor, warehouseID int64) (bool, error) {
	var exists bool
	err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM cash_sessions WHERE warehouse_id = $1 AND status = 'open')`, warehouseID).Scan(&exists)
	return exists, err
}

// MarkSaleCredit deja el pedido como venta a crédito con la parte que el cliente dejó a crédito.
func (r *PaymentRepository) MarkSaleCredit(ctx context.Context, q db.DBExecutor, saleID int64, creditAmount float64) error {
	const sql = `
		UPDATE sales SET
			payment_method = 'credit',
			payment_condition = 'credit',
			credit_amount = $1,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	_, err := q.Exec(ctx, sql, creditAmount, saleID)
	return err
}
