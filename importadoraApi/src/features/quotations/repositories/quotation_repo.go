package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/quotations/dtos"

	"github.com/jackc/pgx/v5"
)

type QuotationEntity struct {
	ID            int64
	CompanyID     int64
	SerialCode    string
	CustomerID    int64
	CustomerName  string
	EmployeeID    int64
	EmployeeName  string
	CartID        *int64
	SaleID        *int64
	Status        types.QuotationStatus
	ValidUntil    *time.Time
	Subtotal      float64
	DiscountTotal float64
	IVATotal      float64
	Total         float64
	Notes         *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type QuotationItemEntity struct {
	ID          int64
	QuotationID int64
	ProductID   int64
	ProductCode string
	ProductName string
	Quantity    int
	UnitPrice   float64
	Discount    float64
	IVAPercent  *float64
	LineTotal   float64
}

type QuotationRepository struct{}

func NewQuotationRepository() *QuotationRepository {
	return &QuotationRepository{}
}

func (r *QuotationRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*QuotationEntity, error) {
	const sql = `
		SELECT
			quo.id, quo.company_id, quo.serial_code,
			quo.customer_id, COALESCE(cust.name, ''),
			quo.employee_id, COALESCE(emp.full_name, ''),
			quo.cart_id, quo.sale_id, quo.status, quo.valid_until,
			quo.subtotal, quo.discount_total, quo.iva_total, quo.total,
			quo.notes, quo.created_at, quo.updated_at
		FROM quotations quo
		LEFT JOIN customers cust ON cust.id = quo.customer_id
		LEFT JOIN employees emp ON emp.id = quo.employee_id
		WHERE quo.id = $1
	`
	var qe QuotationEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&qe.ID, &qe.CompanyID, &qe.SerialCode,
		&qe.CustomerID, &qe.CustomerName,
		&qe.EmployeeID, &qe.EmployeeName,
		&qe.CartID, &qe.SaleID, &qe.Status, &qe.ValidUntil,
		&qe.Subtotal, &qe.DiscountTotal, &qe.IVATotal, &qe.Total,
		&qe.Notes, &qe.CreatedAt, &qe.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &qe, nil
}

func (r *QuotationRepository) List(ctx context.Context, q db.DBExecutor, f dtos.QuotationFilterQuery) ([]QuotationEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("quo.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.CustomerID != nil {
		where = append(where, fmt.Sprintf("quo.customer_id = $%d", argIdx))
		args = append(args, *f.CustomerID)
		argIdx++
	}

	if f.EmployeeID != nil {
		where = append(where, fmt.Sprintf("quo.employee_id = $%d", argIdx))
		args = append(args, *f.EmployeeID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("quo.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	if f.Search != "" {
		where = append(where, fmt.Sprintf("(quo.serial_code ILIKE $%d OR cust.name ILIKE $%d OR cust.document ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM quotations quo
		LEFT JOIN customers cust ON cust.id = quo.customer_id
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
			quo.id, quo.company_id, quo.serial_code,
			quo.customer_id, COALESCE(cust.name, ''),
			quo.employee_id, COALESCE(emp.full_name, ''),
			quo.cart_id, quo.sale_id, quo.status, quo.valid_until,
			quo.subtotal, quo.discount_total, quo.iva_total, quo.total,
			quo.notes, quo.created_at, quo.updated_at
		FROM quotations quo
		LEFT JOIN customers cust ON cust.id = quo.customer_id
		LEFT JOIN employees emp ON emp.id = quo.employee_id
		%s
		ORDER BY quo.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]QuotationEntity, 0)
	for rows.Next() {
		var qe QuotationEntity
		if err := rows.Scan(
			&qe.ID, &qe.CompanyID, &qe.SerialCode,
			&qe.CustomerID, &qe.CustomerName,
			&qe.EmployeeID, &qe.EmployeeName,
			&qe.CartID, &qe.SaleID, &qe.Status, &qe.ValidUntil,
			&qe.Subtotal, &qe.DiscountTotal, &qe.IVATotal, &qe.Total,
			&qe.Notes, &qe.CreatedAt, &qe.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, qe)
	}

	return list, total, rows.Err()
}

func (r *QuotationRepository) Create(ctx context.Context, q db.DBExecutor, qe *QuotationEntity) (*QuotationEntity, error) {
	const sql = `
		INSERT INTO quotations (
			company_id, serial_code, customer_id, employee_id, cart_id,
			status, valid_until, subtotal, discount_total, iva_total, total, notes
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11, $12
		)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		qe.CompanyID, qe.SerialCode, qe.CustomerID, qe.EmployeeID, qe.CartID,
		qe.Status, qe.ValidUntil, qe.Subtotal, qe.DiscountTotal, qe.IVATotal, qe.Total, qe.Notes,
	).Scan(&qe.ID, &qe.CreatedAt, &qe.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return qe, nil
}

func (r *QuotationRepository) Update(ctx context.Context, q db.DBExecutor, qe *QuotationEntity) error {
	const sql = `
		UPDATE quotations SET
			status = $1,
			valid_until = $2,
			notes = $3,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
	`
	_, err := q.Exec(ctx, sql, qe.Status, qe.ValidUntil, qe.Notes, qe.ID)
	return err
}

func (r *QuotationRepository) SetSaleID(ctx context.Context, q db.DBExecutor, id, saleID int64) error {
	const sql = `UPDATE quotations SET sale_id = $1, status = 'converted', updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := q.Exec(ctx, sql, saleID, id)
	return err
}

func (r *QuotationRepository) CreateItem(ctx context.Context, q db.DBExecutor, item *QuotationItemEntity) error {
	const sql = `
		INSERT INTO quotation_items (
			quotation_id, product_id, quantity, unit_price, discount, iva_percent, line_total
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	return q.QueryRow(ctx, sql,
		item.QuotationID, item.ProductID, item.Quantity, item.UnitPrice, item.Discount, item.IVAPercent, item.LineTotal,
	).Scan(&item.ID)
}

func (r *QuotationRepository) ListItems(ctx context.Context, q db.DBExecutor, quotationID int64) ([]dtos.QuotationItemResponse, error) {
	const sql = `
		SELECT
			qi.id, qi.quotation_id, qi.product_id, COALESCE(p.code, ''), COALESCE(p.name, ''),
			qi.quantity, qi.unit_price, qi.discount, qi.iva_percent, qi.line_total
		FROM quotation_items qi
		JOIN products p ON p.id = qi.product_id
		WHERE qi.quotation_id = $1
		ORDER BY qi.id ASC
	`
	rows, err := q.Query(ctx, sql, quotationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]dtos.QuotationItemResponse, 0)
	for rows.Next() {
		var it dtos.QuotationItemResponse
		if err := rows.Scan(
			&it.ID, &it.QuotationID, &it.ProductID, &it.ProductCode, &it.ProductName,
			&it.Quantity, &it.UnitPrice, &it.Discount, &it.IVAPercent, &it.LineTotal,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

