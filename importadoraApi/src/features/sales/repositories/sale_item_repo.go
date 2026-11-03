package repositories

// sale_item_repo · renglones del pedido, su avance de etapa y el crédito del cliente
// conecta con: SaleRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_repo.go)

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/sales/dtos"

	"github.com/jackc/pgx/v5"
)

type SaleItemEntity struct {
	ID                     int64
	SaleID                 int64
	ProductID              int64
	StockID                int64
	ProductCode            string
	ProductName            string
	PriceTier              types.PriceTier
	Quantity               int
	PickedQty              int
	PackedQty              int
	DispatchedQty          int
	UnitPrice              float64
	UnitCost               float64
	Discount               float64
	IVAPercent             *float64
	IVAAmount              float64
	Subtotal               float64
	LineTotal              float64
	ProcessStage           types.ProcessStage
	StageStatus            types.StageStatus
	VerifiedByEmployeeID   *int64
	VerifiedByName         *string
	VerifiedAt             *time.Time
	PickedByEmployeeID     *int64
	PickedByName           *string
	PickedAt               *time.Time
	PackedByEmployeeID     *int64
	PackedByName           *string
	PackedAt               *time.Time
	InvoicedByEmployeeID   *int64
	InvoicedByName         *string
	InvoicedAt             *time.Time
	DispatchedByEmployeeID *int64
	DispatchedByName       *string
	DispatchedAt           *time.Time
	SentByEmployeeID       *int64
	SentByName             *string
	SentAt                 *time.Time
	ProcessNotes           *string
}

type CustomerCreditInfo struct {
	CustomerID      int64
	CreditEnabled   bool
	CreditLimit     float64
	CreditBalance   float64
	ReservedOrders  float64
	AvailableCredit float64
}

// CreateItem inserta un renglón.
func (r *SaleRepository) CreateItem(ctx context.Context, q db.DBExecutor, item *SaleItemEntity) error {
	const sql = `
		INSERT INTO sale_items (
			sale_id, product_id, stock_id, product_code, product_name, price_tier,
			quantity, picked_qty, packed_qty, dispatched_qty,
			unit_price, unit_cost, discount, iva_percent, iva_amount,
			subtotal, line_total, process_stage, stage_status
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14, $15,
			$16, $17, $18, $19
		)
		RETURNING id
	`
	return q.QueryRow(ctx, sql,
		item.SaleID, item.ProductID, item.StockID, item.ProductCode, item.ProductName, item.PriceTier,
		item.Quantity, item.PickedQty, item.PackedQty, item.DispatchedQty,
		item.UnitPrice, item.UnitCost, item.Discount, item.IVAPercent, item.IVAAmount,
		item.Subtotal, item.LineTotal, item.ProcessStage, item.StageStatus,
	).Scan(&item.ID)
}

// ListItems lista los renglones.
func (r *SaleRepository) ListItems(ctx context.Context, q db.DBExecutor, saleID int64) ([]dtos.SaleItemResponse, error) {
	const sql = `
		SELECT
			si.id, si.sale_id, si.product_id, si.stock_id, si.product_code, si.product_name, si.price_tier,
			si.quantity, si.picked_qty, si.packed_qty, si.dispatched_qty,
			si.unit_price, si.unit_cost, si.discount, si.iva_percent, si.iva_amount,
			si.subtotal, si.line_total, si.process_stage, si.stage_status,
			si.verified_by_employee_id, vemp.full_name, si.verified_at,
			si.picked_by_employee_id, pemp.full_name, si.picked_at,
			si.packed_by_employee_id, pkemp.full_name, si.packed_at,
			si.invoiced_by_employee_id, iemp.full_name, si.invoiced_at,
			si.dispatched_by_employee_id, demp.full_name, si.dispatched_at,
			si.sent_by_employee_id, semp.full_name, si.sent_at,
			si.process_notes
		FROM sale_items si
		LEFT JOIN employees vemp ON vemp.id = si.verified_by_employee_id
		LEFT JOIN employees pemp ON pemp.id = si.picked_by_employee_id
		LEFT JOIN employees pkemp ON pkemp.id = si.packed_by_employee_id
		LEFT JOIN employees iemp ON iemp.id = si.invoiced_by_employee_id
		LEFT JOIN employees demp ON demp.id = si.dispatched_by_employee_id
		LEFT JOIN employees semp ON semp.id = si.sent_by_employee_id
		WHERE si.sale_id = $1
		ORDER BY si.id ASC
	`
	rows, err := q.Query(ctx, sql, saleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]dtos.SaleItemResponse, 0)
	for rows.Next() {
		var it dtos.SaleItemResponse
		if err := rows.Scan(
			&it.ID, &it.SaleID, &it.ProductID, &it.StockID, &it.ProductCode, &it.ProductName, &it.PriceTier,
			&it.Quantity, &it.PickedQty, &it.PackedQty, &it.DispatchedQty,
			&it.UnitPrice, &it.UnitCost, &it.Discount, &it.IVAPercent, &it.IVAAmount,
			&it.Subtotal, &it.LineTotal, &it.ProcessStage, &it.StageStatus,
			&it.VerifiedByEmployeeID, &it.VerifiedByName, &it.VerifiedAt,
			&it.PickedByEmployeeID, &it.PickedByName, &it.PickedAt,
			&it.PackedByEmployeeID, &it.PackedByName, &it.PackedAt,
			&it.InvoicedByEmployeeID, &it.InvoicedByName, &it.InvoicedAt,
			&it.DispatchedByEmployeeID, &it.DispatchedByName, &it.DispatchedAt,
			&it.SentByEmployeeID, &it.SentByName, &it.SentAt,
			&it.ProcessNotes,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

// AdvanceItemsStage pasa los renglones del pedido a la etapa indicada.
func (r *SaleRepository) AdvanceItemsStage(ctx context.Context, q db.DBExecutor, saleID int64, stage types.ProcessStage, employeeID int64, stageType string) error {
	var sql string
	switch stageType {
	case "verify":
		sql = `
			UPDATE sale_items SET
				process_stage = $1,
				stage_status = 'completed',
				verified_by_employee_id = $2,
				verified_at = CURRENT_TIMESTAMP
			WHERE sale_id = $3
		`
	case "pick":
		sql = `
			UPDATE sale_items SET
				process_stage = $1,
				stage_status = 'completed',
				picked_qty = quantity,
				picked_by_employee_id = $2,
				picked_at = CURRENT_TIMESTAMP
			WHERE sale_id = $3
		`
	case "pack":
		sql = `
			UPDATE sale_items SET
				process_stage = $1,
				stage_status = 'completed',
				packed_qty = quantity,
				packed_by_employee_id = $2,
				packed_at = CURRENT_TIMESTAMP
			WHERE sale_id = $3
		`
	case "invoice":
		sql = `
			UPDATE sale_items SET
				process_stage = $1,
				stage_status = 'completed',
				invoiced_by_employee_id = $2,
				invoiced_at = CURRENT_TIMESTAMP
			WHERE sale_id = $3
		`
	case "dispatch":
		sql = `
			UPDATE sale_items SET
				process_stage = $1,
				stage_status = 'completed',
				dispatched_qty = quantity,
				dispatched_by_employee_id = $2,
				dispatched_at = CURRENT_TIMESTAMP
			WHERE sale_id = $3
		`
	case "send":
		sql = `
			UPDATE sale_items SET
				process_stage = $1,
				stage_status = 'completed',
				sent_by_employee_id = $2,
				sent_at = CURRENT_TIMESTAMP
			WHERE sale_id = $3
		`
	default:
		sql = `UPDATE sale_items SET process_stage = $1, stage_status = 'completed' WHERE sale_id = $3`
	}

	_, err := q.Exec(ctx, sql, stage, employeeID, saleID)
	return err
}

// GetCustomerCreditInfo trae el crédito del cliente (cupo, saldo, pedidos reservados y disponible) para validar una venta a crédito.
func (r *SaleRepository) GetCustomerCreditInfo(ctx context.Context, q db.DBExecutor, customerID int64) (*CustomerCreditInfo, error) {
	const sql = `
		SELECT
			customer_id, credit_enabled, credit_limit,
			credit_balance, reserved_orders, available_credit
		FROM v_customer_credit_summary
		WHERE customer_id = $1
	`
	var info CustomerCreditInfo
	err := q.QueryRow(ctx, sql, customerID).Scan(
		&info.CustomerID, &info.CreditEnabled, &info.CreditLimit,
		&info.CreditBalance, &info.ReservedOrders, &info.AvailableCredit,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &info, nil
}
