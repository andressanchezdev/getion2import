package repositories

// sale_repo.go · acceso a la base de ventas: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de ventas; los usan los services de ventas

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/sales/dtos"

	"github.com/jackc/pgx/v5"
)

// stageQueue dice qué etapa «terminada» se suma a cada etapa al listar: el pedido verificado espera en la cola de picking, y así.
var stageQueue = map[string]string{
	"picking":   "verification_ok",
	"packing":   "picking_ok",
	"invoicing": "packing_ok",
	"dispatch":  "invoicing_ok",
}

type SaleEntity struct {
	ID                     int64
	CompanyID              int64
	SerialCode             string
	CustomerID             *int64
	CustomerName           *string
	EmployeeID             int64
	EmployeeName           string
	WarehouseID            int64
	WarehouseName          string
	CartID                 *int64
	PriceTier              types.PriceTier
	PaymentMethod          types.PaymentMethod
	PaymentCondition       *types.PaymentCondition
	ImmediatePicking       bool
	Status                 types.SaleStatus
	CurrentStage           types.ProcessStage
	Subtotal               float64
	DiscountTotal          float64
	IVATotal               float64
	Total                  float64
	PaidTotal              float64
	CreditAmount           float64 // la parte del pedido que el cliente dejó a crédito
	SaleAt                 *time.Time
	DueDate                *time.Time
	ShippingAddress        []byte
	CarrierID              *int64
	CarrierName            *string
	TrackingNo             *string
	CancelReason           *string
	CancelledByEmployeeID  *int64
	CancelledByName        *string
	PaymentProofURL        *string
	PaymentReference       *string
	Notes                  *string
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

type SaleRepository struct{}

// NewSaleRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewSaleRepository() *SaleRepository {
	return &SaleRepository{}
}

// FindByID busca el pedido por su id.
func (r *SaleRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*SaleEntity, error) {
	const sql = `
		SELECT
			s.id, s.company_id, s.serial_code,
			s.customer_id, cust.name,
			s.employee_id, COALESCE(emp.full_name, ''),
			s.warehouse_id, COALESCE(w.name, ''),
			s.cart_id, s.price_tier, s.payment_method, s.payment_condition,
			s.immediate_picking, s.status, s.current_stage,
			s.subtotal, s.discount_total, s.iva_total, s.total, s.paid_total, s.credit_amount,
			s.sale_at, s.due_date, s.shipping_address,
			s.carrier_id, ext.name, s.tracking_no,
			s.cancel_reason, s.cancelled_by_employee_id, cemp.full_name,
			s.payment_proof_url, s.payment_reference,
			s.notes, s.created_at, s.updated_at
		FROM sales s
		LEFT JOIN customers cust ON cust.id = s.customer_id
		LEFT JOIN employees emp ON emp.id = s.employee_id
		LEFT JOIN warehouses w ON w.id = s.warehouse_id
		LEFT JOIN externals ext ON ext.id = s.carrier_id
		LEFT JOIN employees cemp ON cemp.id = s.cancelled_by_employee_id
		WHERE s.id = $1
	`
	var s SaleEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&s.ID, &s.CompanyID, &s.SerialCode,
		&s.CustomerID, &s.CustomerName,
		&s.EmployeeID, &s.EmployeeName,
		&s.WarehouseID, &s.WarehouseName,
		&s.CartID, &s.PriceTier, &s.PaymentMethod, &s.PaymentCondition,
		&s.ImmediatePicking, &s.Status, &s.CurrentStage,
		&s.Subtotal, &s.DiscountTotal, &s.IVATotal, &s.Total, &s.PaidTotal, &s.CreditAmount,
		&s.SaleAt, &s.DueDate, &s.ShippingAddress,
		&s.CarrierID, &s.CarrierName, &s.TrackingNo,
		&s.CancelReason, &s.CancelledByEmployeeID, &s.CancelledByName,
		&s.PaymentProofURL, &s.PaymentReference,
		&s.Notes, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// List lista los pedidos según los filtros, con su total para paginar.
func (r *SaleRepository) List(ctx context.Context, q db.DBExecutor, f dtos.SaleFilterQuery) ([]SaleEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("s.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("s.warehouse_id = $%d", argIdx))
		args = append(args, *f.WarehouseID)
		argIdx++
	}

	if f.CustomerID != nil {
		where = append(where, fmt.Sprintf("s.customer_id = $%d", argIdx))
		args = append(args, *f.CustomerID)
		argIdx++
	}

	if f.EmployeeID != nil {
		where = append(where, fmt.Sprintf("s.employee_id = $%d", argIdx))
		args = append(args, *f.EmployeeID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("s.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	if f.Stage != nil && *f.Stage != "" {
		// cada etapa incluye la cola de los pedidos que ya terminaron la anterior (X_ok): picking trae también los verification_ok, y así
		if queue, ok := stageQueue[string(*f.Stage)]; ok {
			where = append(where, fmt.Sprintf("s.current_stage IN ($%d, $%d)", argIdx, argIdx+1))
			args = append(args, queue, *f.Stage)
			argIdx += 2
		} else {
			where = append(where, fmt.Sprintf("s.current_stage = $%d", argIdx))
			args = append(args, *f.Stage)
			argIdx++
		}
	}

	if f.PaymentMethod != nil && *f.PaymentMethod != "" {
		where = append(where, fmt.Sprintf("s.payment_method = $%d", argIdx))
		args = append(args, *f.PaymentMethod)
		argIdx++
	}

	if f.Search != "" {
		where = append(where, fmt.Sprintf("(s.serial_code ILIKE $%d OR cust.name ILIKE $%d OR cust.document ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM sales s
		LEFT JOIN customers cust ON cust.id = s.customer_id
		%s
	`, whereClause)

	var total int
	if err := q.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	pageSize := f.PageSize
	if pageSize <= 0 {
		pageSize = 30
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	selectSQL := fmt.Sprintf(`
		SELECT
			s.id, s.company_id, s.serial_code,
			s.customer_id, cust.name,
			s.employee_id, COALESCE(emp.full_name, ''),
			s.warehouse_id, COALESCE(w.name, ''),
			s.cart_id, s.price_tier, s.payment_method, s.payment_condition,
			s.immediate_picking, s.status, s.current_stage,
			s.subtotal, s.discount_total, s.iva_total, s.total, s.paid_total, s.credit_amount,
			s.sale_at, s.due_date, s.shipping_address,
			s.carrier_id, ext.name, s.tracking_no,
			s.cancel_reason, s.cancelled_by_employee_id, cemp.full_name,
			s.payment_proof_url, s.payment_reference,
			s.notes, s.created_at, s.updated_at
		FROM sales s
		LEFT JOIN customers cust ON cust.id = s.customer_id
		LEFT JOIN employees emp ON emp.id = s.employee_id
		LEFT JOIN warehouses w ON w.id = s.warehouse_id
		LEFT JOIN externals ext ON ext.id = s.carrier_id
		LEFT JOIN employees cemp ON cemp.id = s.cancelled_by_employee_id
		%s
		ORDER BY s.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]SaleEntity, 0)
	for rows.Next() {
		var s SaleEntity
		if err := rows.Scan(
			&s.ID, &s.CompanyID, &s.SerialCode,
			&s.CustomerID, &s.CustomerName,
			&s.EmployeeID, &s.EmployeeName,
			&s.WarehouseID, &s.WarehouseName,
			&s.CartID, &s.PriceTier, &s.PaymentMethod, &s.PaymentCondition,
			&s.ImmediatePicking, &s.Status, &s.CurrentStage,
			&s.Subtotal, &s.DiscountTotal, &s.IVATotal, &s.Total, &s.PaidTotal, &s.CreditAmount,
			&s.SaleAt, &s.DueDate, &s.ShippingAddress,
			&s.CarrierID, &s.CarrierName, &s.TrackingNo,
			&s.CancelReason, &s.CancelledByEmployeeID, &s.CancelledByName,
			&s.PaymentProofURL, &s.PaymentReference,
			&s.Notes, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, s)
	}

	return list, total, rows.Err()
}

// Create inserta el pedido y devuelve el registro guardado.
func (r *SaleRepository) Create(ctx context.Context, q db.DBExecutor, s *SaleEntity) (*SaleEntity, error) {
	const sql = `
		INSERT INTO sales (
			company_id, serial_code, customer_id, employee_id, warehouse_id, cart_id,
			price_tier, payment_method, payment_condition, immediate_picking,
			status, current_stage, subtotal, discount_total, iva_total, total, paid_total,
			due_date, shipping_address, carrier_id, tracking_no, payment_proof_url, payment_reference, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17,
			$18, $19, $20, $21, $22, $23, $24
		)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		s.CompanyID, s.SerialCode, s.CustomerID, s.EmployeeID, s.WarehouseID, s.CartID,
		s.PriceTier, s.PaymentMethod, s.PaymentCondition, s.ImmediatePicking,
		s.Status, s.CurrentStage, s.Subtotal, s.DiscountTotal, s.IVATotal, s.Total, s.PaidTotal,
		s.DueDate, s.ShippingAddress, s.CarrierID, s.TrackingNo, s.PaymentProofURL, s.PaymentReference, s.Notes,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

// UpdateStage cambia la etapa del pedido (verificación, alistamiento, empaque, facturación, despacho o envío) y su estado.
func (r *SaleRepository) UpdateStage(ctx context.Context, q db.DBExecutor, saleID int64, stage types.ProcessStage, status types.SaleStatus) error {
	const sql = `
		UPDATE sales SET
			current_stage = $1,
			status = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`
	_, err := q.Exec(ctx, sql, stage, status, saleID)
	return err
}

// Cancel marca el pedido como cancelado con su motivo.
func (r *SaleRepository) Cancel(ctx context.Context, q db.DBExecutor, saleID, cancelledByEmployeeID int64, reason string) error {
	const sql = `
		UPDATE sales SET
			status = 'cancelled',
			current_stage = 'cancelled',
			cancelled_by_employee_id = $1,
			cancel_reason = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`
	_, err := q.Exec(ctx, sql, cancelledByEmployeeID, reason, saleID)
	return err
}

// MarkCompleted marca el pedido como completado.
func (r *SaleRepository) MarkCompleted(ctx context.Context, q db.DBExecutor, saleID int64) error {
	const sql = `
		UPDATE sales SET
			status = 'completed',
			current_stage = 'sent',
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := q.Exec(ctx, sql, saleID)
	return err
}

// ==========================================
// MÉTODOS PARA FACTURAS
// ==========================================

