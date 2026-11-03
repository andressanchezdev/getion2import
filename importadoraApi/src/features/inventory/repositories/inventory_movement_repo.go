package repositories

// inventory_movement_repo · movimientos de inventario: registrar y listar
// conecta con: InventoryRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en inventory_repo.go)

import (
	"context"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/inventory/dtos"
)

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

// RecordMovement registra un movimiento de inventario en la auditoría y devuelve lo guardado.
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

// ListMovements lista los movimientos de inventario (kardex) según los filtros, con su total para paginar.
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
