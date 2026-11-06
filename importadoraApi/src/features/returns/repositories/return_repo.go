package repositories

// return_repo.go · acceso a la base de devoluciones: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de devoluciones; los usan los services de devoluciones

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/returns/dtos"

	"github.com/jackc/pgx/v5"
)

type ReturnEntity struct {
	ID                     int64
	CompanyID              int64
	SaleID                 int64
	SaleSerial             string
	WarehouseID             int64
	WarehouseName           string
	CustomerID             int64
	CustomerName           string
	EmployeeID             int64
	EmployeeName           string
	ApprovedByEmployeeID   *int64
	ApprovedByName         *string
	Reason                 string
	ReasonType             types.ReturnReasonType
	ResolutionType         types.ReturnResolutionType
	ReplacementProductID   *int64
	ReplacementStockID     *int64
	ReplacementProductCode *string
	ReplacementProductName *string
	EvidenceURL            *string
	ReceiptURL             *string
	Status                 types.ReturnStatus
	Total                  float64
	ApprovedAt             *time.Time
	CreatedAt              time.Time
}

type ReturnItemEntity struct {
	ID          int64
	ReturnID    int64
	SaleItemID  int64
	Quantity    int
	Restock     bool
	ProductCode string
	ProductName string
	UnitPrice   float64
	LineTotal   float64
	StockID     int64
	ProductID   int64
	UnitCost    float64
	WarehouseID int64
}

type ReturnRepository struct{}

// NewReturnRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewReturnRepository() *ReturnRepository {
	return &ReturnRepository{}
}

// Create inserta la devolución y devuelve el registro guardado.
func (r *ReturnRepository) Create(ctx context.Context, q db.DBExecutor, ret *ReturnEntity) (*ReturnEntity, error) {
	const sql = `
		INSERT INTO returns (
			company_id, sale_id, customer_id, employee_id, reason, status, total,
			reason_type, resolution_type, replacement_product_id, replacement_stock_id,
			evidence_url, receipt_url
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		RETURNING id, created_at
	`
	err := q.QueryRow(ctx, sql,
		ret.CompanyID, ret.SaleID, ret.CustomerID, ret.EmployeeID, ret.Reason, ret.Status, ret.Total,
		ret.ReasonType, ret.ResolutionType, ret.ReplacementProductID, ret.ReplacementStockID,
		ret.EvidenceURL, ret.ReceiptURL,
	).Scan(&ret.ID, &ret.CreatedAt)
	if err != nil {
		return nil, err
	}
	return ret, nil
}

// CreateItem inserta un renglón.
func (r *ReturnRepository) CreateItem(ctx context.Context, q db.DBExecutor, item *ReturnItemEntity) error {
	const sql = `
		INSERT INTO return_items (
			return_id, sale_item_id, quantity, restock
		) VALUES (
			$1, $2, $3, $4
		)
		RETURNING id
	`
	return q.QueryRow(ctx, sql, item.ReturnID, item.SaleItemID, item.Quantity, item.Restock).Scan(&item.ID)
}

// FindByID busca la devolución por su id (nil si no existe).
func (r *ReturnRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*ReturnEntity, error) {
	const sql = `
		SELECT
			ret.id, ret.company_id, ret.sale_id, s.serial_code,
			s.warehouse_id, COALESCE(w.name, ''),
			ret.customer_id, cust.name,
			ret.employee_id, emp.full_name,
			ret.approved_by_employee_id, aemp.full_name,
			ret.reason, ret.reason_type, ret.resolution_type,
			ret.replacement_product_id, ret.replacement_stock_id,
			rp.code, rp.name,
			ret.evidence_url, ret.receipt_url,
			ret.status, ret.total, ret.approved_at, ret.created_at
		FROM returns ret
		JOIN sales s ON s.id = ret.sale_id
		LEFT JOIN warehouses w ON w.id = s.warehouse_id
		JOIN customers cust ON cust.id = ret.customer_id
		JOIN employees emp ON emp.id = ret.employee_id
		LEFT JOIN employees aemp ON aemp.id = ret.approved_by_employee_id
		LEFT JOIN products rp ON rp.id = ret.replacement_product_id
		WHERE ret.id = $1
	`
	var entity ReturnEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&entity.ID, &entity.CompanyID, &entity.SaleID, &entity.SaleSerial,
		&entity.WarehouseID, &entity.WarehouseName,
		&entity.CustomerID, &entity.CustomerName,
		&entity.EmployeeID, &entity.EmployeeName,
		&entity.ApprovedByEmployeeID, &entity.ApprovedByName,
		&entity.Reason, &entity.ReasonType, &entity.ResolutionType,
		&entity.ReplacementProductID, &entity.ReplacementStockID,
		&entity.ReplacementProductCode, &entity.ReplacementProductName,
		&entity.EvidenceURL, &entity.ReceiptURL,
		&entity.Status, &entity.Total, &entity.ApprovedAt, &entity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &entity, nil
}

// ListItems lista los renglones.
func (r *ReturnRepository) ListItems(ctx context.Context, q db.DBExecutor, returnID int64) ([]ReturnItemEntity, error) {
	const sql = `
		SELECT
			ri.id, ri.return_id, ri.sale_item_id, ri.quantity, ri.restock,
			si.product_code, si.product_name, si.unit_price, (si.unit_price * ri.quantity) as line_total,
			si.stock_id, si.product_id, si.unit_cost, s.warehouse_id
		FROM return_items ri
		JOIN sale_items si ON si.id = ri.sale_item_id
		JOIN sales s ON s.id = si.sale_id
		WHERE ri.return_id = $1
		ORDER BY ri.id ASC
	`
	rows, err := q.Query(ctx, sql, returnID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ReturnItemEntity, 0)
	for rows.Next() {
		var it ReturnItemEntity
		if err := rows.Scan(
			&it.ID, &it.ReturnID, &it.SaleItemID, &it.Quantity, &it.Restock,
			&it.ProductCode, &it.ProductName, &it.UnitPrice, &it.LineTotal,
			&it.StockID, &it.ProductID, &it.UnitCost, &it.WarehouseID,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

// List lista las devoluciones según los filtros, con su total para paginar.
func (r *ReturnRepository) List(ctx context.Context, q db.DBExecutor, f dtos.ReturnFilterQuery) ([]ReturnEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("ret.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("s.warehouse_id = $%d", argIdx))
		args = append(args, *f.WarehouseID)
		argIdx++
	}

	if f.SaleID != nil {
		where = append(where, fmt.Sprintf("ret.sale_id = $%d", argIdx))
		args = append(args, *f.SaleID)
		argIdx++
	}

	if f.CustomerID != nil {
		where = append(where, fmt.Sprintf("ret.customer_id = $%d", argIdx))
		args = append(args, *f.CustomerID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("ret.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM returns ret JOIN sales s ON s.id = ret.sale_id %s`, whereClause)
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
			ret.id, ret.company_id, ret.sale_id, s.serial_code,
			s.warehouse_id, COALESCE(w.name, ''),
			ret.customer_id, cust.name,
			ret.employee_id, emp.full_name,
			ret.approved_by_employee_id, aemp.full_name,
			ret.reason, ret.reason_type, ret.resolution_type,
			ret.replacement_product_id, ret.replacement_stock_id,
			rp.code, rp.name,
			ret.evidence_url, ret.receipt_url,
			ret.status, ret.total, ret.approved_at, ret.created_at
		FROM returns ret
		JOIN sales s ON s.id = ret.sale_id
		LEFT JOIN warehouses w ON w.id = s.warehouse_id
		JOIN customers cust ON cust.id = ret.customer_id
		JOIN employees emp ON emp.id = ret.employee_id
		LEFT JOIN employees aemp ON aemp.id = ret.approved_by_employee_id
		LEFT JOIN products rp ON rp.id = ret.replacement_product_id
		%s
		ORDER BY ret.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]ReturnEntity, 0)
	for rows.Next() {
		var entity ReturnEntity
		if err := rows.Scan(
			&entity.ID, &entity.CompanyID, &entity.SaleID, &entity.SaleSerial,
			&entity.WarehouseID, &entity.WarehouseName,
			&entity.CustomerID, &entity.CustomerName,
			&entity.EmployeeID, &entity.EmployeeName,
			&entity.ApprovedByEmployeeID, &entity.ApprovedByName,
			&entity.Reason, &entity.ReasonType, &entity.ResolutionType,
			&entity.ReplacementProductID, &entity.ReplacementStockID,
			&entity.ReplacementProductCode, &entity.ReplacementProductName,
			&entity.EvidenceURL, &entity.ReceiptURL,
			&entity.Status, &entity.Total, &entity.ApprovedAt, &entity.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, entity)
	}

	return list, total, rows.Err()
}

// Approve pasa la devolución de «pendiente» a «aprobada» y guarda quién la aprobó.
func (r *ReturnRepository) Approve(ctx context.Context, q db.DBExecutor, id, approverEmployeeID int64) error {
	const sql = `
		UPDATE returns SET
			status = 'approved',
			approved_by_employee_id = $1,
			approved_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = 'pending'
	`
	cmdTag, err := q.Exec(ctx, sql, approverEmployeeID, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("la devolución no existe o ya no está en estado pendiente")
	}
	return nil
}

// Reject pasa la devolución de «pendiente» a «rechazada» y guarda quién la rechazó.
func (r *ReturnRepository) Reject(ctx context.Context, q db.DBExecutor, id, approverEmployeeID int64) error {
	const sql = `
		UPDATE returns SET
			status = 'rejected',
			approved_by_employee_id = $1,
			approved_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = 'pending'
	`
	cmdTag, err := q.Exec(ctx, sql, approverEmployeeID, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("la devolución no existe o ya no está en estado pendiente")
	}
	return nil
}

// ReplacementStock es el stock de reemplazo de un cambio, con lo que hay disponible y reservado
type ReplacementStock struct {
	ProductID   int64
	Available   int
	Reserved    int
	ProductCode string
}

// FindReplacementStock busca el stock de reemplazo dentro de la compañía de la venta
func (r *ReturnRepository) FindReplacementStock(ctx context.Context, q db.DBExecutor, stockID, companyID int64) (*ReplacementStock, error) {
	const sql = `
		SELECT s.product_id, s.available, s.reserved, p.code
		FROM stock s
		JOIN products p ON p.id = s.product_id
		WHERE s.id = $1 AND s.company_id = $2
	`
	var st ReplacementStock
	if err := q.QueryRow(ctx, sql, stockID, companyID).Scan(&st.ProductID, &st.Available, &st.Reserved, &st.ProductCode); err != nil {
		return nil, err
	}
	return &st, nil
}

// LockedReplacementStock es la ubicación del stock de reemplazo, ya bloqueada para entregarlo
type LockedReplacementStock struct {
	WarehouseID int64
	ProductID   int64
	ProductCode string
}

// LockReplacementStock bloquea la fila del stock de reemplazo (FOR UPDATE) y devuelve su bodega y producto
func (r *ReturnRepository) LockReplacementStock(ctx context.Context, q db.DBExecutor, stockID int64) (*LockedReplacementStock, error) {
	const sql = `
		SELECT s.warehouse_id, s.product_id, p.code
		FROM stock s
		JOIN products p ON p.id = s.product_id
		WHERE s.id = $1
		FOR UPDATE
	`
	var st LockedReplacementStock
	if err := q.QueryRow(ctx, sql, stockID).Scan(&st.WarehouseID, &st.ProductID, &st.ProductCode); err != nil {
		return nil, err
	}
	return &st, nil
}

// DecrementStock descuenta una unidad del stock y devuelve cuántas filas cambió (0 si no había disponible)
func (r *ReturnRepository) DecrementStock(ctx context.Context, q db.DBExecutor, stockID int64) (int64, error) {
	tag, err := q.Exec(ctx, `UPDATE stock SET available = available - 1 WHERE id = $1 AND available >= 1`, stockID)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// InsertReturnCreditEntry asienta el saldo a favor del cliente por una devolución aprobada
func (r *ReturnRepository) InsertReturnCreditEntry(ctx context.Context, q db.DBExecutor, companyID, customerID, employeeID int64, amount float64, returnID int64, reason string) error {
	const sql = `
		INSERT INTO credit_entries (
			company_id, customer_id, employee_id, entry_type, amount, return_id, reason
		) VALUES (
			$1, $2, $3, 'return', $4, $5, $6
		)
	`
	_, err := q.Exec(ctx, sql, companyID, customerID, employeeID, amount, returnID, reason)
	return err
}
