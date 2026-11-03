package repositories

// warehouse_location_repo · ubicaciones (estantes y pasillos) de la bodega
// conecta con: WarehouseRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en warehouse_repo.go)

import (
	"context"
	"errors"
	"fmt"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

type WarehouseLocationEntity struct {
	ID           int64
	CompanyID    int64
	WarehouseID  int64
	Code         string
	QRCode       string
	Status       string
	Description  *string
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	ProductCount int // productos distintos que hay en la ubicación (solo lo llena ListLocations)
	Units        int // unidades que hay en la ubicación (solo lo llena ListLocations)
}

// ListLocations lista las ubicaciones según los filtros, con su total para paginar.
func (r *WarehouseRepository) ListLocations(ctx context.Context, q db.DBExecutor, warehouseID int64, activeOnly bool) ([]WarehouseLocationEntity, error) {
	where := "WHERE l.warehouse_id = $1"
	if activeOnly {
		where += " AND l.is_active = TRUE"
	}
	sql := fmt.Sprintf(`
		SELECT l.id, l.company_id, l.warehouse_id, l.code, COALESCE(l.qr_code, ''),
			CASE WHEN COALESCE(st.units, 0) > 0 THEN 'ocupada' ELSE 'libre' END AS status,
			l.description, l.is_active, l.created_at, l.updated_at,
			COALESCE(st.products, 0), COALESCE(st.units, 0)
		FROM warehouse_locations l
		LEFT JOIN (
			SELECT warehouse_id, location, COUNT(DISTINCT product_id) FILTER (WHERE available > 0) AS products, SUM(available) AS units
			FROM stock
			GROUP BY warehouse_id, location
		) st ON st.warehouse_id = l.warehouse_id AND st.location = l.code
		%s
		ORDER BY l.code ASC
	`, where)
	rows, err := q.Query(ctx, sql, warehouseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]WarehouseLocationEntity, 0)
	for rows.Next() {
		var l WarehouseLocationEntity
		if err := rows.Scan(&l.ID, &l.CompanyID, &l.WarehouseID, &l.Code, &l.QRCode, &l.Status, &l.Description, &l.IsActive, &l.CreatedAt, &l.UpdatedAt, &l.ProductCount, &l.Units); err != nil {
			return nil, err
		}
		items = append(items, l)
	}
	return items, nil
}

// FindLocationByID busca la ubicación por su id (nil si no existe).
func (r *WarehouseRepository) FindLocationByID(ctx context.Context, q db.DBExecutor, id int64) (*WarehouseLocationEntity, error) {
	const sql = `
		SELECT id, company_id, warehouse_id, code, COALESCE(qr_code, ''), description, is_active, created_at, updated_at
		FROM warehouse_locations
		WHERE id = $1
	`
	var l WarehouseLocationEntity
	err := q.QueryRow(ctx, sql, id).Scan(&l.ID, &l.CompanyID, &l.WarehouseID, &l.Code, &l.QRCode, &l.Description, &l.IsActive, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &l, nil
}

// CreateLocation inserta la ubicación.
func (r *WarehouseRepository) CreateLocation(ctx context.Context, q db.DBExecutor, loc *WarehouseLocationEntity) (*WarehouseLocationEntity, error) {
	const sql = `
		INSERT INTO warehouse_locations (company_id, warehouse_id, code, description, is_active)
		VALUES ($1, $2, $3, $4, TRUE)
		RETURNING id, COALESCE(qr_code, ''), is_active, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql, loc.CompanyID, loc.WarehouseID, loc.Code, loc.Description).Scan(
		&loc.ID, &loc.QRCode, &loc.IsActive, &loc.CreatedAt, &loc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	loc.Status = "libre"
	return loc, nil
}

// UpdateLocation actualiza los datos de la ubicación.
func (r *WarehouseRepository) UpdateLocation(ctx context.Context, q db.DBExecutor, loc *WarehouseLocationEntity) (*WarehouseLocationEntity, error) {
	const sql = `
		UPDATE warehouse_locations
		SET code = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING updated_at
	`
	err := q.QueryRow(ctx, sql, loc.Code, loc.Description, loc.IsActive, loc.ID).Scan(&loc.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return loc, nil
}

// CountStockInLocation cuenta las existencias que hay en una ubicación (para no borrar una que tiene stock).
func (r *WarehouseRepository) CountStockInLocation(ctx context.Context, q db.DBExecutor, warehouseID int64, locationCode string) (int, error) {
	const sql = `
		SELECT COALESCE(SUM(available + reserved), 0)
		FROM stock
		WHERE warehouse_id = $1 AND location = $2
	`
	var count int
	err := q.QueryRow(ctx, sql, warehouseID, locationCode).Scan(&count)
	return count, err
}

// DeleteLocation elimina la ubicación.
func (r *WarehouseRepository) DeleteLocation(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `DELETE FROM warehouse_locations WHERE id = $1`
	_, err := q.Exec(ctx, sql, id)
	return err
}

// FindLocationByCode busca la ubicación de la bodega por su código (nil si no existe).
func (r *WarehouseRepository) FindLocationByCode(ctx context.Context, q db.DBExecutor, warehouseID int64, code string) (*WarehouseLocationEntity, error) {
	const sql = `
		SELECT id, company_id, warehouse_id, code, COALESCE(qr_code, ''), description, is_active, created_at, updated_at
		FROM warehouse_locations
		WHERE warehouse_id = $1 AND code = $2
	`
	var l WarehouseLocationEntity
	err := q.QueryRow(ctx, sql, warehouseID, code).Scan(&l.ID, &l.CompanyID, &l.WarehouseID, &l.Code, &l.QRCode, &l.Description, &l.IsActive, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &l, nil
}

// RenameStockLocation cambia el código de ubicación de las existencias de la bodega (cuando se renombra la ubicación, para que no queden huérfanas).
func (r *WarehouseRepository) RenameStockLocation(ctx context.Context, q db.DBExecutor, warehouseID int64, oldCode, newCode string) error {
	const sql = `UPDATE stock SET location = $3, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = $1 AND location = $2`
	_, err := q.Exec(ctx, sql, warehouseID, oldCode, newCode)
	return err
}
