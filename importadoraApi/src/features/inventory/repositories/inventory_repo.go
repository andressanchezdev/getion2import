package repositories

// inventory_repo.go · acceso a la base de inventario: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de inventario; los usan los services de inventario

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
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

type InventoryRepository struct{}

// NewInventoryRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
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

// ListWarehouseStock lista las existencias de las bodegas según los filtros, con su total para paginar.
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

// ListCompanyStock lista las existencias de toda la compañía, sumadas por producto.
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

// UpsertStockDelta suma o resta existencias de un producto en una bodega y ubicación; crea la fila si todavía no existe.
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

// SetStockAvailable fija la cantidad disponible de una fila de stock (por ejemplo al corregir un conteo).
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

// ErrInsufficientStock indica que otra reserva ya se llevó las unidades vendibles (disponible - reservado) de esa existencia.
var ErrInsufficientStock = errors.New("stock insuficiente para reservar")

// ReserveStock reserva unidades para un pedido o traslado solo si alcanzan (disponible menos reservado).
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
		return ErrInsufficientStock
	}
	return nil
}

// ReleaseReservation libera unidades reservadas (por ejemplo al anular un pedido o traslado).
func (r *InventoryRepository) ReleaseReservation(ctx context.Context, q db.DBExecutor, stockID int64, qty int) error {
	const sql = `
		UPDATE stock
		SET reserved = GREATEST(0, reserved - $1), updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	_, err := q.Exec(ctx, sql, qty, stockID)
	return err
}

// DeductStock descuenta del stock lo que sale de verdad (baja lo disponible y lo reservado).
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

// ==========================================
// MÉTODOS DE TRASLADOS MULTI-ÍTEM
// ==========================================

// ==========================================
// MÉTODOS DE CONTEOS FÍSICOS
// ==========================================

