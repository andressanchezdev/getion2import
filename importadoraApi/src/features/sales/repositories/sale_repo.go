package repositories

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
	SaleAt                 *time.Time
	DueDate                *time.Time
	ShippingAddress        []byte
	CarrierID              *int64
	CarrierName            *string
	TrackingNo             *string
	CancelReason           *string
	CancelledByEmployeeID  *int64
	CancelledByName        *string
	Notes                  *string
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

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

type InvoiceEntity struct {
	ID                     int64
	CompanyID              int64
	WarehouseID            int64
	WarehouseName          string
	WarehouseFacturationID int64
	SaleID                 int64
	SaleSerial             string
	ReturnID               *int64
	EmployeeID             *int64
	EmployeeName           *string
	Kind                   types.InvoiceKind
	Number                 string
	Status                 types.InvoiceStatus
	PDFURL                 *string
	IssuedAt               time.Time
	CreatedAt              time.Time
}

type CustomerCreditInfo struct {
	CustomerID      int64
	CreditEnabled   bool
	CreditLimit     float64
	CreditBalance   float64
	ReservedOrders  float64
	AvailableCredit float64
}

type SaleRepository struct{}

func NewSaleRepository() *SaleRepository {
	return &SaleRepository{}
}

func (r *SaleRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*SaleEntity, error) {
	const sql = `
		SELECT
			s.id, s.company_id, s.serial_code,
			s.customer_id, cust.name,
			s.employee_id, COALESCE(emp.full_name, ''),
			s.warehouse_id, COALESCE(w.name, ''),
			s.cart_id, s.price_tier, s.payment_method, s.payment_condition,
			s.immediate_picking, s.status, s.current_stage,
			s.subtotal, s.discount_total, s.iva_total, s.total, s.paid_total,
			s.sale_at, s.due_date, s.shipping_address,
			s.carrier_id, ext.name, s.tracking_no,
			s.cancel_reason, s.cancelled_by_employee_id, cemp.full_name,
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
		&s.Subtotal, &s.DiscountTotal, &s.IVATotal, &s.Total, &s.PaidTotal,
		&s.SaleAt, &s.DueDate, &s.ShippingAddress,
		&s.CarrierID, &s.CarrierName, &s.TrackingNo,
		&s.CancelReason, &s.CancelledByEmployeeID, &s.CancelledByName,
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
		where = append(where, fmt.Sprintf("s.current_stage = $%d", argIdx))
		args = append(args, *f.Stage)
		argIdx++
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
			s.subtotal, s.discount_total, s.iva_total, s.total, s.paid_total,
			s.sale_at, s.due_date, s.shipping_address,
			s.carrier_id, ext.name, s.tracking_no,
			s.cancel_reason, s.cancelled_by_employee_id, cemp.full_name,
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
			&s.Subtotal, &s.DiscountTotal, &s.IVATotal, &s.Total, &s.PaidTotal,
			&s.SaleAt, &s.DueDate, &s.ShippingAddress,
			&s.CarrierID, &s.CarrierName, &s.TrackingNo,
			&s.CancelReason, &s.CancelledByEmployeeID, &s.CancelledByName,
			&s.Notes, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, s)
	}

	return list, total, rows.Err()
}

func (r *SaleRepository) Create(ctx context.Context, q db.DBExecutor, s *SaleEntity) (*SaleEntity, error) {
	const sql = `
		INSERT INTO sales (
			company_id, serial_code, customer_id, employee_id, warehouse_id, cart_id,
			price_tier, payment_method, payment_condition, immediate_picking,
			status, current_stage, subtotal, discount_total, iva_total, total, paid_total,
			due_date, shipping_address, carrier_id, tracking_no, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17,
			$18, $19, $20, $21, $22
		)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		s.CompanyID, s.SerialCode, s.CustomerID, s.EmployeeID, s.WarehouseID, s.CartID,
		s.PriceTier, s.PaymentMethod, s.PaymentCondition, s.ImmediatePicking,
		s.Status, s.CurrentStage, s.Subtotal, s.DiscountTotal, s.IVATotal, s.Total, s.PaidTotal,
		s.DueDate, s.ShippingAddress, s.CarrierID, s.TrackingNo, s.Notes,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

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

// ==========================================
// MÉTODOS PARA FACTURAS
// ==========================================

func (r *SaleRepository) FindWarehouseFacturation(ctx context.Context, q db.DBExecutor, warehouseID int64) (int64, error) {
	const sql = `SELECT id FROM warehouse_facturation WHERE warehouse_id = $1`
	var id int64
	err := q.QueryRow(ctx, sql, warehouseID).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *SaleRepository) CreateInvoice(ctx context.Context, q db.DBExecutor, inv *InvoiceEntity) (*InvoiceEntity, error) {
	const sql = `
		INSERT INTO invoices (
			company_id, warehouse_id, warehouse_facturation_id, sale_id, return_id,
			employee_id, kind, number, status, pdf_url
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10
		)
		RETURNING id, issued_at, created_at
	`
	err := q.QueryRow(ctx, sql,
		inv.CompanyID, inv.WarehouseID, inv.WarehouseFacturationID, inv.SaleID, inv.ReturnID,
		inv.EmployeeID, inv.Kind, inv.Number, inv.Status, inv.PDFURL,
	).Scan(&inv.ID, &inv.IssuedAt, &inv.CreatedAt)
	if err != nil {
		return nil, err
	}
	return inv, nil
}

func (r *SaleRepository) FindInvoiceByID(ctx context.Context, q db.DBExecutor, id int64) (*InvoiceEntity, error) {
	const sql = `
		SELECT
			i.id, i.company_id, i.warehouse_id, COALESCE(w.name, ''),
			i.warehouse_facturation_id, i.sale_id, COALESCE(s.serial_code, ''),
			i.return_id, i.employee_id, emp.full_name,
			i.kind, i.number, i.status, i.pdf_url, i.issued_at, i.created_at
		FROM invoices i
		LEFT JOIN warehouses w ON w.id = i.warehouse_id
		LEFT JOIN sales s ON s.id = i.sale_id
		LEFT JOIN employees emp ON emp.id = i.employee_id
		WHERE i.id = $1
	`
	var inv InvoiceEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&inv.ID, &inv.CompanyID, &inv.WarehouseID, &inv.WarehouseName,
		&inv.WarehouseFacturationID, &inv.SaleID, &inv.SaleSerial,
		&inv.ReturnID, &inv.EmployeeID, &inv.EmployeeName,
		&inv.Kind, &inv.Number, &inv.Status, &inv.PDFURL, &inv.IssuedAt, &inv.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &inv, nil
}

func (r *SaleRepository) ListInvoices(ctx context.Context, q db.DBExecutor, f dtos.InvoiceFilterQuery) ([]InvoiceEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("i.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("i.warehouse_id = $%d", argIdx))
		args = append(args, *f.WarehouseID)
		argIdx++
	}

	if f.SaleID != nil {
		where = append(where, fmt.Sprintf("i.sale_id = $%d", argIdx))
		args = append(args, *f.SaleID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("i.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	if f.Kind != nil && *f.Kind != "" {
		where = append(where, fmt.Sprintf("i.kind = $%d", argIdx))
		args = append(args, *f.Kind)
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM invoices i %s`, whereClause)
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
			i.id, i.company_id, i.warehouse_id, COALESCE(w.name, ''),
			i.warehouse_facturation_id, i.sale_id, COALESCE(s.serial_code, ''),
			i.return_id, i.employee_id, emp.full_name,
			i.kind, i.number, i.status, i.pdf_url, i.issued_at, i.created_at
		FROM invoices i
		LEFT JOIN warehouses w ON w.id = i.warehouse_id
		LEFT JOIN sales s ON s.id = i.sale_id
		LEFT JOIN employees emp ON emp.id = i.employee_id
		%s
		ORDER BY i.issued_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]InvoiceEntity, 0)
	for rows.Next() {
		var inv InvoiceEntity
		if err := rows.Scan(
			&inv.ID, &inv.CompanyID, &inv.WarehouseID, &inv.WarehouseName,
			&inv.WarehouseFacturationID, &inv.SaleID, &inv.SaleSerial,
			&inv.ReturnID, &inv.EmployeeID, &inv.EmployeeName,
			&inv.Kind, &inv.Number, &inv.Status, &inv.PDFURL, &inv.IssuedAt, &inv.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, inv)
	}

	return list, total, rows.Err()
}

func (r *SaleRepository) AnnulInvoice(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `UPDATE invoices SET status = 'annulled' WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("factura no encontrada")
	}
	return nil
}

