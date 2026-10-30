package repositories

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
	EmployeeID    int64
	EmployeeName  string
	Status        types.PurchaseStatus
	SupplierRef   *string
	ExpectedDate  *time.Time
	Subtotal      float64
	IVATotal      float64
	Total         float64
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

func NewPurchaseRepository() *PurchaseRepository {
	return &PurchaseRepository{}
}

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

func (r *PurchaseRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*PurchaseEntity, error) {
	const sql = `
		SELECT
			p.id, p.company_id, p.serial_code, p.supplier_id, s.name,
			p.warehouse_id, w.name, p.employee_id, e.full_name,
			p.status, p.supplier_ref, p.expected_date, p.subtotal, p.iva_total, p.total,
			p.notes, p.received_at, p.created_at, p.updated_at
		FROM purchases p
		JOIN externals s ON s.id = p.supplier_id
		JOIN warehouses w ON w.id = p.warehouse_id
		JOIN employees e ON e.id = p.employee_id
		WHERE p.id = $1
	`
	var entity PurchaseEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&entity.ID, &entity.CompanyID, &entity.SerialCode, &entity.SupplierID, &entity.SupplierName,
		&entity.WarehouseID, &entity.WarehouseName, &entity.EmployeeID, &entity.EmployeeName,
		&entity.Status, &entity.SupplierRef, &entity.ExpectedDate, &entity.Subtotal, &entity.IVATotal, &entity.Total,
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
			p.warehouse_id, w.name, p.employee_id, e.full_name,
			p.status, p.supplier_ref, p.expected_date, p.subtotal, p.iva_total, p.total,
			p.notes, p.received_at, p.created_at, p.updated_at
		FROM purchases p
		JOIN externals s ON s.id = p.supplier_id
		JOIN warehouses w ON w.id = p.warehouse_id
		JOIN employees e ON e.id = p.employee_id
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
			&entity.Status, &entity.SupplierRef, &entity.ExpectedDate, &entity.Subtotal, &entity.IVATotal, &entity.Total,
			&entity.Notes, &entity.ReceivedAt, &entity.CreatedAt, &entity.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, entity)
	}

	return list, total, rows.Err()
}

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

func (r *PurchaseRepository) UpdateStatus(ctx context.Context, q db.DBExecutor, purchaseID int64, status types.PurchaseStatus, receivedAt *time.Time) error {
	const sql = `
		UPDATE purchases
		SET status = $1, received_at = COALESCE($2, received_at), updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`
	_, err := q.Exec(ctx, sql, status, receivedAt, purchaseID)
	return err
}

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

