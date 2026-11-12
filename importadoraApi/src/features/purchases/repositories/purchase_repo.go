package repositories

// purchase_repo.go · acceso a la base de compras: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de compras; los usan los services de compras

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/purchases/dtos"

	"github.com/jackc/pgx/v5"
)

type PurchaseEntity struct {
	ID            int64
	CompanyID     int64
	SerialCode    string
	SupplierID    int64
	SupplierName  string
	WarehouseID   int64
	WarehouseName string
	EmployeeID    *int64 // quien la creó; vacío si la creó un administrador sin empleado
	EmployeeName  string
	Status        types.PurchaseStatus
	SupplierRef   *string
	ExpectedDate  *time.Time
	Subtotal      float64
	IVATotal      float64
	Total         float64
	PaidTotal     float64 // lo que la caja ya pagó de la recepción
	Notes         *string
	ReceivedAt    *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type PurchaseItemEntity struct {
	ID           int64
	PurchaseID   int64
	ProductID    int64
	ProductCode  string
	ProductName  string
	SupplierCode *string
	Quantity     int
	ReceivedQty  int
	UnitCost     float64
	IVAPercent   *float64
	Subtotal     float64
}

type PurchaseRepository struct{}

// NewPurchaseRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewPurchaseRepository() *PurchaseRepository {
	return &PurchaseRepository{}
}

// Create inserta la orden de compra y devuelve el registro guardado.
func (r *PurchaseRepository) Create(ctx context.Context, q db.DBExecutor, p *PurchaseEntity) (*PurchaseEntity, error) {
	const sql = `
		INSERT INTO purchases (
			company_id, serial_code, supplier_id, warehouse_id, employee_id,
			status, supplier_ref, expected_date, subtotal, iva_total, total, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		p.CompanyID, p.SerialCode, p.SupplierID, p.WarehouseID, p.EmployeeID,
		p.Status, p.SupplierRef, p.ExpectedDate, p.Subtotal, p.IVATotal, p.Total, p.Notes,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// CreateItem inserta un renglón.
func (r *PurchaseRepository) CreateItem(ctx context.Context, q db.DBExecutor, it *PurchaseItemEntity) error {
	const sql = `
		INSERT INTO purchase_items (
			purchase_id, product_id, quantity, received_qty, unit_cost, iva_percent, subtotal
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)
		RETURNING id
	`
	return q.QueryRow(ctx, sql,
		it.PurchaseID, it.ProductID, it.Quantity, it.ReceivedQty, it.UnitCost, it.IVAPercent, it.Subtotal,
	).Scan(&it.ID)
}

// FindByID busca la orden de compra por su id (nil si no existe).
func (r *PurchaseRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*PurchaseEntity, error) {
	const sql = `
		SELECT
			p.id, p.company_id, p.serial_code, p.supplier_id, s.name,
			p.warehouse_id, w.name, p.employee_id, COALESCE(e.full_name, ''),
			p.status, p.supplier_ref, p.expected_date, p.subtotal, p.iva_total, p.total, p.paid_total,
			p.notes, p.received_at, p.created_at, p.updated_at
		FROM purchases p
		JOIN externals s ON s.id = p.supplier_id
		JOIN warehouses w ON w.id = p.warehouse_id
		LEFT JOIN employees e ON e.id = p.employee_id
		WHERE p.id = $1
	`
	var entity PurchaseEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&entity.ID, &entity.CompanyID, &entity.SerialCode, &entity.SupplierID, &entity.SupplierName,
		&entity.WarehouseID, &entity.WarehouseName, &entity.EmployeeID, &entity.EmployeeName,
		&entity.Status, &entity.SupplierRef, &entity.ExpectedDate, &entity.Subtotal, &entity.IVATotal, &entity.Total, &entity.PaidTotal,
		&entity.Notes, &entity.ReceivedAt, &entity.CreatedAt, &entity.UpdatedAt,
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
func (r *PurchaseRepository) ListItems(ctx context.Context, q db.DBExecutor, purchaseID int64) ([]PurchaseItemEntity, error) {
	const sql = `
		SELECT
			pi.id, pi.purchase_id, pi.product_id, prod.code, prod.name,
			ps.supplier_code, pi.quantity, pi.received_qty, pi.unit_cost, pi.iva_percent, pi.subtotal
		FROM purchase_items pi
		JOIN products prod ON prod.id = pi.product_id
		JOIN purchases p ON p.id = pi.purchase_id
		LEFT JOIN product_suppliers ps ON ps.product_id = pi.product_id AND ps.supplier_id = p.supplier_id
		WHERE pi.purchase_id = $1
		ORDER BY pi.id ASC
	`
	rows, err := q.Query(ctx, sql, purchaseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]PurchaseItemEntity, 0)
	for rows.Next() {
		var it PurchaseItemEntity
		if err := rows.Scan(
			&it.ID, &it.PurchaseID, &it.ProductID, &it.ProductCode, &it.ProductName,
			&it.SupplierCode, &it.Quantity, &it.ReceivedQty, &it.UnitCost, &it.IVAPercent, &it.Subtotal,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

// List lista las órdenes de compra según los filtros, con su total para paginar.
func (r *PurchaseRepository) List(ctx context.Context, q db.DBExecutor, f dtos.PurchaseFilterQuery) ([]PurchaseEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("p.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.SupplierID != nil {
		where = append(where, fmt.Sprintf("p.supplier_id = $%d", argIdx))
		args = append(args, *f.SupplierID)
		argIdx++
	}

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("p.warehouse_id = $%d", argIdx))
		args = append(args, *f.WarehouseID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("p.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	if strings.TrimSpace(f.Search) != "" {
		where = append(where, fmt.Sprintf("(p.serial_code ILIKE $%d OR s.name ILIKE $%d OR p.supplier_ref ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+strings.TrimSpace(f.Search)+"%")
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM purchases p
		JOIN externals s ON s.id = p.supplier_id
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
			p.id, p.company_id, p.serial_code, p.supplier_id, s.name,
			p.warehouse_id, w.name, p.employee_id, COALESCE(e.full_name, ''),
			p.status, p.supplier_ref, p.expected_date, p.subtotal, p.iva_total, p.total, p.paid_total,
			p.notes, p.received_at, p.created_at, p.updated_at
		FROM purchases p
		JOIN externals s ON s.id = p.supplier_id
		JOIN warehouses w ON w.id = p.warehouse_id
		LEFT JOIN employees e ON e.id = p.employee_id
		%s
		ORDER BY p.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]PurchaseEntity, 0)
	for rows.Next() {
		var entity PurchaseEntity
		if err := rows.Scan(
			&entity.ID, &entity.CompanyID, &entity.SerialCode, &entity.SupplierID, &entity.SupplierName,
			&entity.WarehouseID, &entity.WarehouseName, &entity.EmployeeID, &entity.EmployeeName,
			&entity.Status, &entity.SupplierRef, &entity.ExpectedDate, &entity.Subtotal, &entity.IVATotal, &entity.Total, &entity.PaidTotal,
			&entity.Notes, &entity.ReceivedAt, &entity.CreatedAt, &entity.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, entity)
	}

	return list, total, rows.Err()
}

// UpdateItemReceived guarda la cantidad recibida de un renglón de la orden de compra.
func (r *PurchaseRepository) UpdateItemReceived(ctx context.Context, q db.DBExecutor, itemID int64, additionalQty int) error {
	const sql = `
		UPDATE purchase_items
		SET received_qty = received_qty + $1
		WHERE id = $2 AND (received_qty + $1) <= quantity
	`
	cmdTag, err := q.Exec(ctx, sql, additionalQty, itemID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("la cantidad recibida supera la cantidad solicitada en el ítem de compra")
	}
	return nil
}

// UpdateStatus cambia el estado de la orden de compra.
func (r *PurchaseRepository) UpdateStatus(ctx context.Context, q db.DBExecutor, purchaseID int64, status types.PurchaseStatus, receivedAt *time.Time) error {
	const sql = `
		UPDATE purchases
		SET status = $1, received_at = COALESCE($2, received_at), updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`
	_, err := q.Exec(ctx, sql, status, receivedAt, purchaseID)
	return err
}

// UpsertSupplierProduct guarda o actualiza un producto del catálogo de un proveedor (código, costo y descripción).
func (r *PurchaseRepository) UpsertSupplierProduct(ctx context.Context, q db.DBExecutor, productID, supplierID int64, cost float64, supplierCode string) error {
	const sql = `
		INSERT INTO product_suppliers (product_id, supplier_id, cost, supplier_code)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (product_id, supplier_id) DO UPDATE SET
			cost = EXCLUDED.cost,
			supplier_code = CASE WHEN EXCLUDED.supplier_code <> '' THEN EXCLUDED.supplier_code ELSE product_suppliers.supplier_code END
	`
	_, err := q.Exec(ctx, sql, productID, supplierID, cost, supplierCode)
	return err
}

// FindProductByCode busca un producto de la compañía por su código.
func (r *PurchaseRepository) FindProductByCode(ctx context.Context, q db.DBExecutor, companyID int64, code string) (int64, string, error) {
	const sql = `
		SELECT id, name FROM products
		WHERE company_id = $1 AND (code = $2 OR oem = $2 OR barcode = $2)
		LIMIT 1
	`
	var id int64
	var name string
	err := q.QueryRow(ctx, sql, companyID, code).Scan(&id, &name)
	if err != nil {
		return 0, "", err
	}
	return id, name, nil
}

// ListSupplierProducts lista los productos del catálogo de un proveedor.
func (r *PurchaseRepository) ListSupplierProducts(ctx context.Context, q db.DBExecutor, supplierID int64) ([]dtos.SupplierProductItemDTO, error) {
	const sql = `
		SELECT
			ps.product_id, p.code, p.name, COALESCE(ps.supplier_code, ''), ps.cost
		FROM product_suppliers ps
		JOIN products p ON p.id = ps.product_id
		WHERE ps.supplier_id = $1
		ORDER BY p.name ASC
	`
	rows, err := q.Query(ctx, sql, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]dtos.SupplierProductItemDTO, 0)
	for rows.Next() {
		var it dtos.SupplierProductItemDTO
		if err := rows.Scan(&it.ProductID, &it.ProductCode, &it.ProductName, &it.SupplierCode, &it.Cost); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, rows.Err()
}

// UpdateProductLastCost guarda el costo de la última compra recibida en el producto
func (r *PurchaseRepository) UpdateProductLastCost(ctx context.Context, q db.DBExecutor, productID int64, cost float64) error {
	const sql = `UPDATE products SET last_cost = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := q.Exec(ctx, sql, cost, productID)
	return err
}

// SupplierOffers dice si el proveedor vende ese producto (está en su catálogo product_suppliers); lo usa la orden de compra.
func (r *PurchaseRepository) SupplierOffers(ctx context.Context, q db.DBExecutor, supplierID, productID int64) (bool, error) {
	var ok bool
	err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM product_suppliers WHERE supplier_id = $1 AND product_id = $2)`, supplierID, productID).Scan(&ok)
	return ok, err
}

// DeleteSupplierProduct quita un producto del catálogo del proveedor y dice si estaba.
func (r *PurchaseRepository) DeleteSupplierProduct(ctx context.Context, q db.DBExecutor, supplierID, productID int64) (bool, error) {
	tag, err := q.Exec(ctx, `DELETE FROM product_suppliers WHERE supplier_id = $1 AND product_id = $2`, supplierID, productID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// ProductCompany devuelve la compañía dueña del producto (0 si no existe).
func (r *PurchaseRepository) ProductCompany(ctx context.Context, q db.DBExecutor, productID int64) (int64, error) {
	var companyID int64
	err := q.QueryRow(ctx, `SELECT company_id FROM products WHERE id = $1 AND deleted_at IS NULL`, productID).Scan(&companyID)
	if err != nil {
		return 0, nil
	}
	return companyID, nil
}

// FindOpenCashSession devuelve el turno de caja abierto de quien paga en esa bodega (0 si no tiene).
// ojo: consulta cash_sessions porque pagar una recepción es un gasto del turno de esa caja
func (r *PurchaseRepository) FindOpenCashSession(ctx context.Context, q db.DBExecutor, companyID, warehouseID int64, actorType string, actorID int64) (int64, error) {
	var id int64
	err := q.QueryRow(ctx, `
		SELECT id FROM cash_sessions
		WHERE company_id = $1 AND warehouse_id = $2 AND opened_by_actor_type = $3 AND opened_by_actor_id = $4 AND status = 'open'
		LIMIT 1
	`, companyID, warehouseID, actorType, actorID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return id, err
}

// InsertReceptionExpense registra, como gasto del turno de caja, el pago de una recepción de compra (queda ligado a la orden).
func (r *PurchaseRepository) InsertReceptionExpense(ctx context.Context, q db.DBExecutor, sessionID, purchaseID int64, receipt, concept string, cash float64) (int64, error) {
	var id int64
	err := q.QueryRow(ctx, `
		INSERT INTO cash_session_expenses (cash_session_id, expense_type, receipt_number, concept, cash_amount, transfer_amount, purchase_id)
		VALUES ($1, 'merchandise_arrival', NULLIF($2, ''), $3, $4, 0, $5)
		RETURNING id
	`, sessionID, receipt, concept, cash, purchaseID).Scan(&id)
	return id, err
}

// AddPaidTotal suma lo pagado a la orden de compra.
func (r *PurchaseRepository) AddPaidTotal(ctx context.Context, q db.DBExecutor, purchaseID int64, amount float64) error {
	_, err := q.Exec(ctx, `UPDATE purchases SET paid_total = paid_total + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, amount, purchaseID)
	return err
}
