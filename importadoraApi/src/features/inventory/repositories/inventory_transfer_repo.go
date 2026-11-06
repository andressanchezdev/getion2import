package repositories

// inventory_transfer_repo · traslados entre bodegas: cabecera, renglones y cambios de estado
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
	IsPriority             bool
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

// FindTransferByID busca un traslado por su id.
func (r *InventoryRepository) FindTransferByID(ctx context.Context, q db.DBExecutor, id int64) (*TransferEntity, error) {
	const sql = `
		SELECT
			t.id, t.company_id, t.serial_code,
			t.origin_warehouse_id, COALESCE(ow.name, ''),
			t.destination_warehouse_id, COALESCE(dw.name, ''),
			t.employee_id, COALESCE(emp.full_name, ''),
			t.dispatched_by_employee_id, disp.full_name,
			t.received_by_employee_id, recv.full_name,
			t.status, t.is_priority, t.notes, t.cancel_reason,
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
		&t.Status, &t.IsPriority, &t.Notes, &t.CancelReason,
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

// ListTransfers lista los traslados según los filtros, con su total para paginar.
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

	if f.WarehouseID != nil {
		where = append(where, fmt.Sprintf("(t.origin_warehouse_id = $%d OR t.destination_warehouse_id = $%d)", argIdx, argIdx))
		args = append(args, *f.WarehouseID)
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
			t.status, t.is_priority, t.notes, t.cancel_reason,
			t.dispatched_at, t.received_at, t.created_at, t.updated_at
		FROM transfers t
		LEFT JOIN warehouses ow ON ow.id = t.origin_warehouse_id
		LEFT JOIN warehouses dw ON dw.id = t.destination_warehouse_id
		LEFT JOIN employees emp ON emp.id = t.employee_id
		LEFT JOIN employees disp ON disp.id = t.dispatched_by_employee_id
		LEFT JOIN employees recv ON recv.id = t.received_by_employee_id
		%s
		ORDER BY t.is_priority DESC, t.created_at DESC
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
			&t.Status, &t.IsPriority, &t.Notes, &t.CancelReason,
			&t.DispatchedAt, &t.ReceivedAt, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, t)
	}

	return list, total, rows.Err()
}

// CreateTransfer inserta el traslado.
func (r *InventoryRepository) CreateTransfer(ctx context.Context, q db.DBExecutor, t *TransferEntity) (*TransferEntity, error) {
	const sql = `
		INSERT INTO transfers (
			company_id, serial_code, origin_warehouse_id, destination_warehouse_id,
			employee_id, status, is_priority, notes
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8
		)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		t.CompanyID, t.SerialCode, t.OriginWarehouseID, t.DestinationWarehouseID,
		t.EmployeeID, t.Status, t.IsPriority, t.Notes,
	).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

// CreateTransferItem inserta el renglón de traslado.
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

// ListTransferItems lista los renglones de traslado según los filtros, con su total para paginar.
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

// ListTransferItemsByTransferIDs obtiene los renglones de múltiples traslados agrupados por transfer_id.
func (r *InventoryRepository) ListTransferItemsByTransferIDs(ctx context.Context, q db.DBExecutor, transferIDs []int64) (map[int64][]TransferItemEntity, error) {
	result := make(map[int64][]TransferItemEntity)
	if len(transferIDs) == 0 {
		return result, nil
	}
	const sql = `
		SELECT
			id, transfer_id, product_id, product_code, product_name,
			origin_stock_id, destination_stock_id, destination_location,
			quantity, received_qty, notes
		FROM details_transfer
		WHERE transfer_id = ANY($1)
		ORDER BY id ASC
	`
	rows, err := q.Query(ctx, sql, transferIDs)
	if err != nil {
		return result, err
	}
	defer rows.Close()

	for rows.Next() {
		var item TransferItemEntity
		if err := rows.Scan(
			&item.ID, &item.TransferID, &item.ProductID, &item.ProductCode, &item.ProductName,
			&item.OriginStockID, &item.DestinationStockID, &item.DestinationLocation,
			&item.Quantity, &item.ReceivedQty, &item.Notes,
		); err != nil {
			return result, err
		}
		result[item.TransferID] = append(result[item.TransferID], item)
	}
	return result, rows.Err()
}

// DispatchTransfer marca el traslado como despachado (en tránsito) y guarda quién lo hizo.
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

// ReceiveTransfer marca el traslado como recibido, con o sin novedad, y guarda quién lo hizo.
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

// CancelTransfer marca el traslado como anulado con su motivo.
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

// UpdateTransferItemReceived guarda la cantidad recibida y la ubicación de destino de un renglón del traslado.
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
