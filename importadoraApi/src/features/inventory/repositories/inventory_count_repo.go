package repositories

// inventory_count_repo · conteos físicos de inventario: cabecera, renglones, verificación y corroboración
// conecta con: InventoryRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_repo.go)

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

// FindCountByID busca el conteo físico por su id (nil si no existe).
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

// ListCounts lista los conteos físicos según los filtros, con su total para paginar.
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

// CreateCount inserta el conteo físico.
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

// CreateCountItem inserta el renglón de conteo.
func (r *InventoryRepository) CreateCountItem(ctx context.Context, q db.DBExecutor, item *CountItemEntity) error {
	const sql = `
		INSERT INTO count_items (count_id, stock_id, employee_id, expected_qty, counted_qty)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (count_id, stock_id) DO NOTHING
	`
	_, err := q.Exec(ctx, sql, item.CountID, item.StockID, item.EmployeeID, item.ExpectedQty, item.CountedQty)
	return err
}

// ListCountItems lista los renglones de conteo según los filtros, con su total para paginar.
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

// UpdateCountItemQty guarda la cantidad contada de un renglón del conteo.
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

// VerifyCount marca el conteo físico como verificado y guarda quién lo hizo.
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

// CorroborateCount marca el conteo físico como corroborado por una segunda persona.
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
