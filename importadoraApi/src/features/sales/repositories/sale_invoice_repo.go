package repositories

// sale_invoice_repo · facturas de los pedidos y la facturación de la bodega
// conecta con: SaleRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_repo.go)

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

type WarehouseFacturationResolution struct {
	ID                   int64
	ResolutionNumber     *string
	ResolutionValidUntil *time.Time
	RangeFrom            *int64
	RangeTo              *int64
	ResolutionExpired    bool
}

// FindWarehouseFacturation busca la configuración de facturación de la bodega del pedido.
func (r *SaleRepository) FindWarehouseFacturation(ctx context.Context, q db.DBExecutor, warehouseID int64) (*WarehouseFacturationResolution, error) {
	const sql = `
		SELECT id, resolution_number, resolution_valid_until, range_from, range_to,
			COALESCE(resolution_valid_until < CURRENT_DATE, FALSE)
		FROM warehouse_facturation
		WHERE warehouse_id = $1
	`
	var facturation WarehouseFacturationResolution
	err := q.QueryRow(ctx, sql, warehouseID).Scan(
		&facturation.ID, &facturation.ResolutionNumber, &facturation.ResolutionValidUntil,
		&facturation.RangeFrom, &facturation.RangeTo, &facturation.ResolutionExpired,
	)
	if err != nil {
		return nil, err
	}
	return &facturation, nil
}

func (r *SaleRepository) FindInvoiceSeriesNextNumber(ctx context.Context, q db.DBExecutor, companyID, warehouseID int64) (int64, error) {
	const sql = `
		SELECT next_number
		FROM doc_series
		WHERE company_id = $1 AND warehouse_id = $2 AND doc_type = $3
	`
	var nextNumber int64
	err := q.QueryRow(ctx, sql, companyID, warehouseID, types.SeriesInvoice).Scan(&nextNumber)
	return nextNumber, err
}

// CreateInvoice inserta la factura de un pedido.
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

// FindInvoiceByID busca una factura por su id.
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

// ListInvoices lista las facturas según los filtros, con su total para paginar.
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

// AnnulInvoice marca una factura como anulada.
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
