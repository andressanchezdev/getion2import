package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/inventory/dtos"

	"github.com/jackc/pgx/v5"
)

type StockEntity struct {
	ID          int64
	CompanyID   int64
	ProductID   int64
	WarehouseID int64
	Location    string
	Available   int
	Reserved    int
	MinStock    int
	MaxStock    *int
	UpdatedAt   time.Time
}

type TransferEntity struct {
	ID                     int64
	CompanyID              int64
	SerialCode             string
	OriginWarehouseID      int64
	OriginWarehouseName    string
	DestinationWarehouseID int64
	DestinationWarehouseName string
	EmployeeID             int64
	EmployeeName           string
	DispatchedByEmployeeID *int64
	DispatchedByName       *string
	ReceivedByEmployeeID   *int64
	ReceivedByName         *string
	Status                 types.TransferStatus
	Notes                  *string
	CancelReason           *string
	DispatchedAt           *time.Time
	ReceivedAt             *time.Time
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

type TransferItemEntity struct {
	ID                  int64
	TransferID          int64
	ProductID           int64
	ProductCode         string
	ProductName         string
	OriginStockID       int64
	DestinationStockID  *int64
	DestinationLocation string
	Quantity            int
	ReceivedQty         int
	Notes               *string
}

type CountEntity struct {
	ID            int64
	CompanyID     int64
	WarehouseID   int64
	WarehouseName string
	EmployeeID    *int64
	EmployeeName  *string
	Status        types.CountStatus
	Notes         *string
	CreatedAt     time.Time
	ClosedAt      *time.Time
}

type CountItemEntity struct {
	ID           int64
	CountID      int64
	StockID      int64
	ProductCode  string
	ProductName  string
	Location     string
	ExpectedQty  int
	CountedQty   *int
	EmployeeID   *int64
	EmployeeName *string
}

type AuditMovementEntity struct {
	ID            int64
	CompanyID     int64
	StockID       int64
	WarehouseID   int64
	WarehouseName string
	ProductID     int64
	ProductCode   string
	ProductName   string
	EmployeeID    *int64
	EmployeeName  *string
	MovementType  types.MovementType
	Quantity      int
	PreviousQty   *int
	NewQty        *int
	ReferenceType *string
	ReferenceID   *int64
	Reason        *string
	CreatedAt     time.Time
}

type InventoryRepository struct{}

func NewInventoryRepository() *InventoryRepository {
	return &InventoryRepository{}
}

// ==========================================
// MÉTODOS DE STOCK
// ==========================================

func (r *InventoryRepository) FindStockByID(ctx context.Context, q db.DBExecutor, id int64) (*StockEntity, error) {
	const sql = `
		SELECT id, company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock, updated_at
		FROM stock
		WHERE id = $1
	`
	var s StockEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&s.ID, &s.CompanyID, &s.ProductID, &s.WarehouseID, &s.Location,
		&s.Available, &s.Reserved, &s.MinStock, &s.MaxStock, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *InventoryRepository) FindStockByProductWarehouseLocation(ctx context.Context, q db.DBExecutor, productID, warehouseID int64, location string) (*StockEntity, error) {
	const sql = `
		SELECT id, company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock, updated_at
		FROM stock
		WHERE product_id = $1 AND warehouse_id = $2 AND location = $3
	`
	var s StockEntity
	err := q.QueryRow(ctx, sql, productID, warehouseID, location).Scan(
		&s.ID, &s.CompanyID, &s.ProductID, &s.WarehouseID, &s.Location,
		&s.Available, &s.Reserved, &s.MinStock, &s.MaxStock, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *InventoryRepository) ListWarehouseStock(ctx context.Context, q db.DBExecutor, f dtos.StockFilterQuery) ([]dtos.WarehouseStockResponse, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("warehouse_id = $%d", argIdx))
		args = append(args, *f.WarehouseID)
		argIdx++
	}

	if f.ProductID != nil {
		where = append(where, fmt.Sprintf("product_id = $%d", argIdx))
		args = append(args, *f.ProductID)
		argIdx++
	}

	if f.Location != nil && *f.Location != "" {
		where = append(where, fmt.Sprintf("location = $%d", argIdx))
		args = append(args, *f.Location)
		argIdx++
	}

	if f.Search != "" {
		where = append(where, fmt.Sprintf("(product_name ILIKE $%d OR product_code ILIKE $%d OR warehouse_name ILIKE $%d OR location ILIKE $%d)", argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM v_warehouse_stock %s", whereClause)
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
			stock_id, company_id, warehouse_id, warehouse_code, warehouse_name,
			product_id, product_code, product_name, category_id, category_name,
			brand_id, brand_name, model_id, model_name,
			iva, prices, location, available, reserved, sellable,
			min_stock, max_stock, updated_at
		FROM v_warehouse_stock
		%s
		ORDER BY warehouse_name ASC, product_name ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]dtos.WarehouseStockResponse, 0)
	for rows.Next() {
		var s dtos.WarehouseStockResponse
		if err := rows.Scan(
			&s.StockID, &s.CompanyID, &s.WarehouseID, &s.WarehouseCode, &s.WarehouseName,
			&s.ProductID, &s.ProductCode, &s.ProductName, &s.CategoryID, &s.CategoryName,
			&s.BrandID, &s.BrandName, &s.ModelID, &s.ModelName,
			&s.IVA, &s.Prices, &s.Location, &s.Available, &s.Reserved, &s.Sellable,
			&s.MinStock, &s.MaxStock, &s.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, s)
	}

	return list, total, rows.Err()
}

func (r *InventoryRepository) ListCompanyStock(ctx context.Context, q db.DBExecutor, companyID int64) ([]dtos.CompanyStockResponse, error) {
	const sql = `
		SELECT company_id, product_id, product_code, product_name, available, reserved, sellable
		FROM v_company_stock
		WHERE company_id = $1
		ORDER BY product_name ASC
	`
	rows, err := q.Query(ctx, sql, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]dtos.CompanyStockResponse, 0)
	for rows.Next() {
		var s dtos.CompanyStockResponse
		if err := rows.Scan(
			&s.CompanyID, &s.ProductID, &s.ProductCode, &s.ProductName,
			&s.Available, &s.Reserved, &s.Sellable,
		); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

func (r *InventoryRepository) UpsertStockDelta(ctx context.Context, q db.DBExecutor, companyID, productID, warehouseID int64, location string, deltaAvailable, deltaReserved int) (*StockEntity, error) {
	const sql = `
		INSERT INTO stock (company_id, product_id, warehouse_id, location, available, reserved)
		VALUES ($1, $2, $3, $4, GREATEST(0, $5), GREATEST(0, $6))
		ON CONFLICT (product_id, warehouse_id, location)
		DO UPDATE SET
			available = stock.available + $5,
			reserved = stock.reserved + $6,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock, updated_at
	`
	var s StockEntity
	err := q.QueryRow(ctx, sql, companyID, productID, warehouseID, location, deltaAvailable, deltaReserved).Scan(
		&s.ID, &s.CompanyID, &s.ProductID, &s.WarehouseID, &s.Location,
		&s.Available, &s.Reserved, &s.MinStock, &s.MaxStock, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *InventoryRepository) SetStockAvailable(ctx context.Context, q db.DBExecutor, stockID int64, newAvailable int) (*StockEntity, error) {
	const sql = `
		UPDATE stock
		SET available = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		RETURNING id, company_id, product_id, warehouse_id, location, available, reserved, min_stock, max_stock, updated_at
	`
	var s StockEntity
	err := q.QueryRow(ctx, sql, newAvailable, stockID).Scan(
		&s.ID, &s.CompanyID, &s.ProductID, &s.WarehouseID, &s.Location,
		&s.Available, &s.Reserved, &s.MinStock, &s.MaxStock, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *InventoryRepository) ReserveStock(ctx context.Context, q db.DBExecutor, stockID int64, qty int) error {
	const sql = `
		UPDATE stock
		SET reserved = reserved + $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND (available - reserved) >= $1
	`
	cmdTag, err := q.Exec(ctx, sql, qty, stockID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("stock insuficiente para reservar")
	}
	return nil
}

func (r *InventoryRepository) ReleaseReservation(ctx context.Context, q db.DBExecutor, stockID int64, qty int) error {
	const sql = `
		UPDATE stock
		SET reserved = GREATEST(0, reserved - $1), updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	_, err := q.Exec(ctx, sql, qty, stockID)
	return err
}

func (r *InventoryRepository) DeductStock(ctx context.Context, q db.DBExecutor, stockID int64, qty int, wasReserved bool) error {
	var sql string
	if wasReserved {
		sql = `
			UPDATE stock
			SET available = available - $1,
			    reserved = GREATEST(0, reserved - $1),
			    updated_at = CURRENT_TIMESTAMP
			WHERE id = $2 AND available >= $1
		`
	} else {
		sql = `
			UPDATE stock
			SET available = available - $1,
			    updated_at = CURRENT_TIMESTAMP
			WHERE id = $2 AND available >= $1
		`
	}
	cmdTag, err := q.Exec(ctx, sql, qty, stockID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("stock disponible insuficiente para descontar")
	}
	return nil
}

// ==========================================
// MÉTODOS DE KARDEX / AUDIT MOVEMENTS
// ==========================================

func (r *InventoryRepository) RecordMovement(ctx context.Context, q db.DBExecutor, m *AuditMovementEntity) (*AuditMovementEntity, error) {
	const sql = `
		INSERT INTO audit_movements (
			company_id, stock_id, employee_id, movement_type,
			quantity, previous_qty, new_qty, reference_type, reference_id, reason
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8, $9, $10
		)
		RETURNING id, created_at
	`
	err := q.QueryRow(ctx, sql,
		m.CompanyID, m.StockID, m.EmployeeID, m.MovementType,
		m.Quantity, m.PreviousQty, m.NewQty, m.ReferenceType, m.ReferenceID, m.Reason,
	).Scan(&m.ID, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *InventoryRepository) ListMovements(ctx context.Context, q db.DBExecutor, f dtos.MovementFilterQuery) ([]dtos.AuditMovementResponse, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("am.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.StockID != nil {
		where = append(where, fmt.Sprintf("am.stock_id = $%d", argIdx))
		args = append(args, *f.StockID)
		argIdx++
	}

	if f.MovementType != nil && *f.MovementType != "" {
		where = append(where, fmt.Sprintf("am.movement_type = $%d", argIdx))
		args = append(args, *f.MovementType)
		argIdx++
	}

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("s.warehouse_id = $%d", argIdx))
		args = append(args, *f.WarehouseID)
		argIdx++
	}

	if f.ProductID != nil {
		where = append(where, fmt.Sprintf("s.product_id = $%d", argIdx))
		args = append(args, *f.ProductID)
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM audit_movements am
		JOIN stock s ON s.id = am.stock_id
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
			am.id, am.company_id, am.stock_id,
			s.warehouse_id, COALESCE(w.name, ''),
			s.product_id, COALESCE(p.code, ''), COALESCE(p.name, ''),
			am.employee_id, COALESCE(emp.full_name, ''),
			am.movement_type, am.quantity, am.previous_qty, am.new_qty,
			am.reference_type, am.reference_id, am.reason, am.created_at
		FROM audit_movements am
		JOIN stock s ON s.id = am.stock_id
		LEFT JOIN warehouses w ON w.id = s.warehouse_id
		LEFT JOIN products p ON p.id = s.product_id
		LEFT JOIN employees emp ON emp.id = am.employee_id
		%s
		ORDER BY am.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]dtos.AuditMovementResponse, 0)
	for rows.Next() {
		var m dtos.AuditMovementResponse
		if err := rows.Scan(
			&m.ID, &m.CompanyID, &m.StockID,
			&m.WarehouseID, &m.WarehouseName,
			&m.ProductID, &m.ProductCode, &m.ProductName,
			&m.EmployeeID, &m.EmployeeName,
			&m.MovementType, &m.Quantity, &m.PreviousQty, &m.NewQty,
			&m.ReferenceType, &m.ReferenceID, &m.Reason, &m.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, m)
	}

	return list, total, rows.Err()
}

// ==========================================
// MÉTODOS DE TRASLADOS MULTI-ÍTEM
// ==========================================

func (r *InventoryRepository) FindTransferByID(ctx context.Context, q db.DBExecutor, id int64) (*TransferEntity, error) {
	const sql = `
		SELECT
			t.id, t.company_id, t.serial_code,
			t.origin_warehouse_id, COALESCE(ow.name, ''),
			t.destination_warehouse_id, COALESCE(dw.name, ''),
			t.employee_id, COALESCE(emp.full_name, ''),
			t.dispatched_by_employee_id, disp.full_name,
			t.received_by_employee_id, recv.full_name,
			t.status, t.notes, t.cancel_reason,
			t.dispatched_at, t.received_at, t.created_at, t.updated_at
		FROM transfers t
		LEFT JOIN warehouses ow ON ow.id = t.origin_warehouse_id
		LEFT JOIN warehouses dw ON dw.id = t.destination_warehouse_id
		LEFT JOIN employees emp ON emp.id = t.employee_id
		LEFT JOIN employees disp ON disp.id = t.dispatched_by_employee_id
		LEFT JOIN employees recv ON recv.id = t.received_by_employee_id
		WHERE t.id = $1
	`
	var t TransferEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&t.ID, &t.CompanyID, &t.SerialCode,
		&t.OriginWarehouseID, &t.OriginWarehouseName,
		&t.DestinationWarehouseID, &t.DestinationWarehouseName,
		&t.EmployeeID, &t.EmployeeName,
		&t.DispatchedByEmployeeID, &t.DispatchedByName,
		&t.ReceivedByEmployeeID, &t.ReceivedByName,
		&t.Status, &t.Notes, &t.CancelReason,
		&t.DispatchedAt, &t.ReceivedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *InventoryRepository) ListTransfers(ctx context.Context, q db.DBExecutor, f dtos.TransferFilterQuery) ([]TransferEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("t.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.OriginWarehouseID != nil {
		where = append(where, fmt.Sprintf("t.origin_warehouse_id = $%d", argIdx))
		args = append(args, *f.OriginWarehouseID)
		argIdx++
	}

	if f.DestinationWarehouseID != nil {
		where = append(where, fmt.Sprintf("t.destination_warehouse_id = $%d", argIdx))
		args = append(args, *f.DestinationWarehouseID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("t.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM transfers t %s", whereClause)
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
			t.id, t.company_id, t.serial_code,
			t.origin_warehouse_id, COALESCE(ow.name, ''),
			t.destination_warehouse_id, COALESCE(dw.name, ''),
			t.employee_id, COALESCE(emp.full_name, ''),
			t.dispatched_by_employee_id, disp.full_name,
			t.received_by_employee_id, recv.full_name,
			t.status, t.notes, t.cancel_reason,
			t.dispatched_at, t.received_at, t.created_at, t.updated_at
		FROM transfers t
		LEFT JOIN warehouses ow ON ow.id = t.origin_warehouse_id
		LEFT JOIN warehouses dw ON dw.id = t.destination_warehouse_id
		LEFT JOIN employees emp ON emp.id = t.employee_id
		LEFT JOIN employees disp ON disp.id = t.dispatched_by_employee_id
		LEFT JOIN employees recv ON recv.id = t.received_by_employee_id
		%s
		ORDER BY t.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]TransferEntity, 0)
	for rows.Next() {
		var t TransferEntity
		if err := rows.Scan(
			&t.ID, &t.CompanyID, &t.SerialCode,
			&t.OriginWarehouseID, &t.OriginWarehouseName,
			&t.DestinationWarehouseID, &t.DestinationWarehouseName,
			&t.EmployeeID, &t.EmployeeName,
			&t.DispatchedByEmployeeID, &t.DispatchedByName,
			&t.ReceivedByEmployeeID, &t.ReceivedByName,
			&t.Status, &t.Notes, &t.CancelReason,
			&t.DispatchedAt, &t.ReceivedAt, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, t)
	}

	return list, total, rows.Err()
}

func (r *InventoryRepository) CreateTransfer(ctx context.Context, q db.DBExecutor, t *TransferEntity) (*TransferEntity, error) {
	const sql = `
		INSERT INTO transfers (
			company_id, serial_code, origin_warehouse_id, destination_warehouse_id,
			employee_id, status, notes
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7
		)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		t.CompanyID, t.SerialCode, t.OriginWarehouseID, t.DestinationWarehouseID,
		t.EmployeeID, t.Status, t.Notes,
	).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *InventoryRepository) CreateTransferItem(ctx context.Context, q db.DBExecutor, item *TransferItemEntity) (*TransferItemEntity, error) {
	const sql = `
		INSERT INTO details_transfer (
			transfer_id, product_id, origin_stock_id, destination_stock_id,
			product_code, product_name, destination_location, quantity, received_qty, notes
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8, $9, $10
		)
		RETURNING id
	`
	err := q.QueryRow(ctx, sql,
		item.TransferID, item.ProductID, item.OriginStockID, item.DestinationStockID,
		item.ProductCode, item.ProductName, item.DestinationLocation, item.Quantity, item.ReceivedQty, item.Notes,
	).Scan(&item.ID)
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (r *InventoryRepository) ListTransferItems(ctx context.Context, q db.DBExecutor, transferID int64) ([]TransferItemEntity, error) {
	const sql = `
		SELECT
			id, transfer_id, product_id, product_code, product_name,
			origin_stock_id, destination_stock_id, destination_location,
			quantity, received_qty, notes
		FROM details_transfer
		WHERE transfer_id = $1
		ORDER BY id ASC
	`
	rows, err := q.Query(ctx, sql, transferID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]TransferItemEntity, 0)
	for rows.Next() {
		var item TransferItemEntity
		if err := rows.Scan(
			&item.ID, &item.TransferID, &item.ProductID, &item.ProductCode, &item.ProductName,
			&item.OriginStockID, &item.DestinationStockID, &item.DestinationLocation,
			&item.Quantity, &item.ReceivedQty, &item.Notes,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *InventoryRepository) DispatchTransfer(ctx context.Context, q db.DBExecutor, transferID, employeeID int64) error {
	const sql = `
		UPDATE transfers SET
			status = 'in_transit',
			dispatched_by_employee_id = $1,
			dispatched_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = 'pending'
	`
	cmdTag, err := q.Exec(ctx, sql, employeeID, transferID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("el traslado no está en estado 'pending' o no existe")
	}
	return nil
}

func (r *InventoryRepository) ReceiveTransfer(ctx context.Context, q db.DBExecutor, transferID, employeeID int64) error {
	const sql = `
		UPDATE transfers SET
			status = 'received',
			received_by_employee_id = $1,
			received_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = 'in_transit'
	`
	cmdTag, err := q.Exec(ctx, sql, employeeID, transferID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("el traslado no está en estado 'in_transit' o no existe")
	}
	return nil
}

func (r *InventoryRepository) CancelTransfer(ctx context.Context, q db.DBExecutor, transferID int64, reason string) error {
	const sql = `
		UPDATE transfers SET
			status = 'cancelled',
			cancel_reason = $1,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = 'pending'
	`
	cmdTag, err := q.Exec(ctx, sql, reason, transferID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("solo se pueden cancelar traslados en estado 'pending'")
	}
	return nil
}

func (r *InventoryRepository) UpdateTransferItemReceived(ctx context.Context, q db.DBExecutor, itemID, destinationStockID int64, receivedQty int) error {
	const sql = `
		UPDATE details_transfer SET
			destination_stock_id = $1,
			received_qty = $2
		WHERE id = $3
	`
	_, err := q.Exec(ctx, sql, destinationStockID, receivedQty, itemID)
	return err
}

// ==========================================
// MÉTODOS DE CONTEOS FÍSICOS
// ==========================================

func (r *InventoryRepository) FindCountByID(ctx context.Context, q db.DBExecutor, id int64) (*CountEntity, error) {
	const sql = `
		SELECT
			c.id, c.company_id, c.warehouse_id, COALESCE(w.name, ''),
			c.employee_id, emp.full_name,
			c.status, c.notes, c.created_at, c.closed_at
		FROM counts c
		LEFT JOIN warehouses w ON w.id = c.warehouse_id
		LEFT JOIN employees emp ON emp.id = c.employee_id
		WHERE c.id = $1
	`
	var c CountEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&c.ID, &c.CompanyID, &c.WarehouseID, &c.WarehouseName,
		&c.EmployeeID, &c.EmployeeName,
		&c.Status, &c.Notes, &c.CreatedAt, &c.ClosedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *InventoryRepository) ListCounts(ctx context.Context, q db.DBExecutor, f dtos.CountFilterQuery) ([]CountEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("c.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("c.warehouse_id = $%d", argIdx))
		args = append(args, *f.WarehouseID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("c.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM counts c %s", whereClause)
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
			c.id, c.company_id, c.warehouse_id, COALESCE(w.name, ''),
			c.employee_id, emp.full_name,
			c.status, c.notes, c.created_at, c.closed_at
		FROM counts c
		LEFT JOIN warehouses w ON w.id = c.warehouse_id
		LEFT JOIN employees emp ON emp.id = c.employee_id
		%s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]CountEntity, 0)
	for rows.Next() {
		var c CountEntity
		if err := rows.Scan(
			&c.ID, &c.CompanyID, &c.WarehouseID, &c.WarehouseName,
			&c.EmployeeID, &c.EmployeeName,
			&c.Status, &c.Notes, &c.CreatedAt, &c.ClosedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, c)
	}

	return list, total, rows.Err()
}

func (r *InventoryRepository) CreateCount(ctx context.Context, q db.DBExecutor, c *CountEntity) (*CountEntity, error) {
	const sql = `
		INSERT INTO counts (company_id, warehouse_id, employee_id, status, notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	err := q.QueryRow(ctx, sql,
		c.CompanyID, c.WarehouseID, c.EmployeeID, c.Status, c.Notes,
	).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *InventoryRepository) CreateCountItem(ctx context.Context, q db.DBExecutor, item *CountItemEntity) error {
	const sql = `
		INSERT INTO count_items (count_id, stock_id, employee_id, expected_qty, counted_qty)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (count_id, stock_id) DO NOTHING
	`
	_, err := q.Exec(ctx, sql, item.CountID, item.StockID, item.EmployeeID, item.ExpectedQty, item.CountedQty)
	return err
}

func (r *InventoryRepository) ListCountItems(ctx context.Context, q db.DBExecutor, countID int64) ([]CountItemEntity, error) {
	const sql = `
		SELECT
			ci.id, ci.count_id, ci.stock_id,
			COALESCE(p.code, ''), COALESCE(p.name, ''), COALESCE(s.location, ''),
			ci.expected_qty, ci.counted_qty,
			ci.employee_id, emp.full_name
		FROM count_items ci
		JOIN stock s ON s.id = ci.stock_id
		JOIN products p ON p.id = s.product_id
		LEFT JOIN employees emp ON emp.id = ci.employee_id
		WHERE ci.count_id = $1
		ORDER BY s.location ASC, p.name ASC
	`
	rows, err := q.Query(ctx, sql, countID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]CountItemEntity, 0)
	for rows.Next() {
		var item CountItemEntity
		if err := rows.Scan(
			&item.ID, &item.CountID, &item.StockID,
			&item.ProductCode, &item.ProductName, &item.Location,
			&item.ExpectedQty, &item.CountedQty,
			&item.EmployeeID, &item.EmployeeName,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *InventoryRepository) UpdateCountItemQty(ctx context.Context, q db.DBExecutor, countID, stockID int64, countedQty int, employeeID *int64) error {
	const sql = `
		UPDATE count_items SET
			counted_qty = $1,
			employee_id = $2
		WHERE count_id = $3 AND stock_id = $4
	`
	_, err := q.Exec(ctx, sql, countedQty, employeeID, countID, stockID)
	return err
}

func (r *InventoryRepository) VerifyCount(ctx context.Context, q db.DBExecutor, countID int64) error {
	const sql = `UPDATE counts SET status = 'verified' WHERE id = $1 AND status = 'pending'`
	cmdTag, err := q.Exec(ctx, sql, countID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("el conteo no está en estado 'pending' o no existe")
	}
	return nil
}

func (r *InventoryRepository) CorroborateCount(ctx context.Context, q db.DBExecutor, countID int64) error {
	const sql = `
		UPDATE counts SET
			status = 'corroborated',
			closed_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND status IN ('pending', 'verified')
	`
	cmdTag, err := q.Exec(ctx, sql, countID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("el conteo ya fue cerrado o no existe")
	}
	return nil
}

