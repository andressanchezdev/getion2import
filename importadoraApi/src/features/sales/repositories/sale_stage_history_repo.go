package repositories

// sale_stage_history_repo.go · historial de etapas del pedido, cobertura de pago y asiento del crédito al facturar
// conecta con: core/db (DBExecutor) y core/types; los usan los services de ventas y de pagos
// ojo: el historial guarda cuándo entró el pedido a cada etapa y cuándo salió; el cierre de la anterior y la apertura de la nueva van juntas en la misma transacción

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"

	"github.com/jackc/pgx/v5"
)

// StageHistoryEntity es una fila del historial: una etapa en la que estuvo el pedido.
type StageHistoryEntity struct {
	Stage        string
	EmployeeName *string
	EnteredAt    time.Time
	LeftAt       *time.Time
}

// UpdateStageBy cambia la etapa del pedido y, si de verdad cambió, deja el movimiento en el historial (quién lo movió y cuándo).
func (r *SaleRepository) UpdateStageBy(ctx context.Context, q db.DBExecutor, saleID int64, stage types.ProcessStage, status types.SaleStatus, employeeID *int64) error {
	var previous string
	if err := q.QueryRow(ctx, `SELECT current_stage FROM sales WHERE id = $1 FOR UPDATE`, saleID).Scan(&previous); err != nil {
		return err
	}
	const update = `
		UPDATE sales SET
			current_stage = $1,
			status = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`
	if _, err := q.Exec(ctx, update, stage, status, saleID); err != nil {
		return err
	}
	if previous == string(stage) {
		return nil
	}
	return r.recordStageChange(ctx, q, saleID, string(stage), employeeID)
}

// RecordInitialStage guarda la primera etapa de un pedido recién creado.
func (r *SaleRepository) RecordInitialStage(ctx context.Context, q db.DBExecutor, saleID int64, stage types.ProcessStage, employeeID *int64) error {
	_, err := q.Exec(ctx, `INSERT INTO sale_stage_history (sale_id, stage, employee_id) VALUES ($1, $2, $3)`, saleID, stage, employeeID)
	return err
}

// recordStageChange cierra la etapa abierta del historial y abre la nueva.
func (r *SaleRepository) recordStageChange(ctx context.Context, q db.DBExecutor, saleID int64, stage string, employeeID *int64) error {
	if _, err := q.Exec(ctx, `UPDATE sale_stage_history SET left_at = CURRENT_TIMESTAMP WHERE sale_id = $1 AND left_at IS NULL`, saleID); err != nil {
		return err
	}
	_, err := q.Exec(ctx, `INSERT INTO sale_stage_history (sale_id, stage, employee_id) VALUES ($1, $2, $3)`, saleID, stage, employeeID)
	return err
}

// ListStageHistory devuelve las etapas por las que pasó el pedido, de la primera a la última.
func (r *SaleRepository) ListStageHistory(ctx context.Context, q db.DBExecutor, saleID int64) ([]StageHistoryEntity, error) {
	const sql = `
		SELECT h.stage, e.full_name, h.entered_at, h.left_at
		FROM sale_stage_history h
		LEFT JOIN employees e ON e.id = h.employee_id
		WHERE h.sale_id = $1
		ORDER BY h.entered_at ASC, h.id ASC
	`
	rows, err := q.Query(ctx, sql, saleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]StageHistoryEntity, 0)
	for rows.Next() {
		var h StageHistoryEntity
		if err := rows.Scan(&h.Stage, &h.EmployeeName, &h.EnteredAt, &h.LeftAt); err != nil {
			return nil, err
		}
		items = append(items, h)
	}
	return items, rows.Err()
}

// SetCreditAmount fija la parte del pedido que el cliente deja a crédito.
func (r *SaleRepository) SetCreditAmount(ctx context.Context, q db.DBExecutor, saleID int64, amount float64) error {
	_, err := q.Exec(ctx, `UPDATE sales SET credit_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, amount, saleID)
	return err
}

// MarkSold marca la fecha de venta (al facturar) y dice si era la primera vez (para no asentar dos veces el cargo a crédito).
func (r *SaleRepository) MarkSold(ctx context.Context, q db.DBExecutor, saleID int64) (firstTime bool, err error) {
	var id int64
	err = q.QueryRow(ctx, `UPDATE sales SET sale_at = CURRENT_TIMESTAMP WHERE id = $1 AND sale_at IS NULL RETURNING id`, saleID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

// InsertCreditCharge asienta en el libro de crédito el cargo de una venta a crédito (negativo: es deuda del cliente).
func (r *SaleRepository) InsertCreditCharge(ctx context.Context, q db.DBExecutor, companyID, customerID, employeeID int64, amount float64, saleID int64, reason string) error {
	const sql = `
		INSERT INTO credit_entries (company_id, customer_id, employee_id, entry_type, amount, sale_id, reason)
		VALUES ($1, $2, $3, 'charge', $4, $5, $6)
	`
	_, err := q.Exec(ctx, sql, companyID, customerID, employeeID, -amount, saleID, reason)
	return err
}
