package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/returns/dtos"

	"github.com/jackc/pgx/v5"
)

type ReturnEntity struct {
	ID                     int64
	CompanyID              int64
	SaleID                 int64
	SaleSerial             string
	CustomerID             int64
	CustomerName           string
	EmployeeID             int64
	EmployeeName           string
	ApprovedByEmployeeID   *int64
	ApprovedByName         *string
	Reason                 string
	ReasonType             types.ReturnReasonType
	ResolutionType         types.ReturnResolutionType
	ReplacementProductID   *int64
	ReplacementStockID     *int64
	ReplacementProductCode *string
	ReplacementProductName *string
	Status                 types.ReturnStatus
	Total                  float64
	ApprovedAt             *time.Time
	CreatedAt              time.Time
}

type ReturnItemEntity struct {
	ID          int64
	ReturnID    int64
	SaleItemID  int64
	Quantity    int
	Restock     bool
	ProductCode string
	ProductName string
	UnitPrice   float64
	LineTotal   float64
	StockID     int64
	ProductID   int64
	UnitCost    float64
	WarehouseID int64
}

type ReturnRepository struct{}

func NewReturnRepository() *ReturnRepository {
	return &ReturnRepository{}
}

func (r *ReturnRepository) Create(ctx context.Context, q db.DBExecutor, ret *ReturnEntity) (*ReturnEntity, error) {
	const sql = `
		INSERT INTO returns (
			company_id, sale_id, customer_id, employee_id, reason, status, total,
			reason_type, resolution_type, replacement_product_id, replacement_stock_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING id, created_at
	`
	err := q.QueryRow(ctx, sql,
		ret.CompanyID, ret.SaleID, ret.CustomerID, ret.EmployeeID, ret.Reason, ret.Status, ret.Total,
		ret.ReasonType, ret.ResolutionType, ret.ReplacementProductID, ret.ReplacementStockID,
	).Scan(&ret.ID, &ret.CreatedAt)
	if err != nil {
		return nil, err
	}
	return ret, nil
}

func (r *ReturnRepository) CreateItem(ctx context.Context, q db.DBExecutor, item *ReturnItemEntity) error {
	const sql = `
		INSERT INTO return_items (
			return_id, sale_item_id, quantity, restock
		) VALUES (
			$1, $2, $3, $4
		)
		RETURNING id
	`
	return q.QueryRow(ctx, sql, item.ReturnID, item.SaleItemID, item.Quantity, item.Restock).Scan(&item.ID)
}

func (r *ReturnRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*ReturnEntity, error) {
	const sql = `
		SELECT
			ret.id, ret.company_id, ret.sale_id, s.serial_code,
			ret.customer_id, cust.name,
			ret.employee_id, emp.full_name,
			ret.approved_by_employee_id, aemp.full_name,
			ret.reason, ret.reason_type, ret.resolution_type,
			ret.replacement_product_id, ret.replacement_stock_id,
			rp.code, rp.name,
			ret.status, ret.total, ret.approved_at, ret.created_at
		FROM returns ret
		JOIN sales s ON s.id = ret.sale_id
		JOIN customers cust ON cust.id = ret.customer_id
		JOIN employees emp ON emp.id = ret.employee_id
		LEFT JOIN employees aemp ON aemp.id = ret.approved_by_employee_id
		LEFT JOIN products rp ON rp.id = ret.replacement_product_id
		WHERE ret.id = $1
	`
	var entity ReturnEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&entity.ID, &entity.CompanyID, &entity.SaleID, &entity.SaleSerial,
		&entity.CustomerID, &entity.CustomerName,
		&entity.EmployeeID, &entity.EmployeeName,
		&entity.ApprovedByEmployeeID, &entity.ApprovedByName,
		&entity.Reason, &entity.ReasonType, &entity.ResolutionType,
		&entity.ReplacementProductID, &entity.ReplacementStockID,
		&entity.ReplacementProductCode, &entity.ReplacementProductName,
		&entity.Status, &entity.Total, &entity.ApprovedAt, &entity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &entity, nil
}

func (r *ReturnRepository) ListItems(ctx context.Context, q db.DBExecutor, returnID int64) ([]ReturnItemEntity, error) {
	const sql = `
		SELECT
			ri.id, ri.return_id, ri.sale_item_id, ri.quantity, ri.restock,
			si.product_code, si.product_name, si.unit_price, (si.unit_price * ri.quantity) as line_total,
			si.stock_id, si.product_id, si.unit_cost, s.warehouse_id
		FROM return_items ri
		JOIN sale_items si ON si.id = ri.sale_item_id
		JOIN sales s ON s.id = si.sale_id
		WHERE ri.return_id = $1
		ORDER BY ri.id ASC
	`
	rows, err := q.Query(ctx, sql, returnID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ReturnItemEntity, 0)
	for rows.Next() {
		var it ReturnItemEntity
		if err := rows.Scan(
			&it.ID, &it.ReturnID, &it.SaleItemID, &it.Quantity, &it.Restock,
			&it.ProductCode, &it.ProductName, &it.UnitPrice, &it.LineTotal,
			&it.StockID, &it.ProductID, &it.UnitCost, &it.WarehouseID,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *ReturnRepository) List(ctx context.Context, q db.DBExecutor, f dtos.ReturnFilterQuery) ([]ReturnEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("ret.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.SaleID != nil {
		where = append(where, fmt.Sprintf("ret.sale_id = $%d", argIdx))
		args = append(args, *f.SaleID)
		argIdx++
	}

	if f.CustomerID != nil {
		where = append(where, fmt.Sprintf("ret.customer_id = $%d", argIdx))
		args = append(args, *f.CustomerID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("ret.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM returns ret %s`, whereClause)
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
			ret.id, ret.company_id, ret.sale_id, s.serial_code,
			ret.customer_id, cust.name,
			ret.employee_id, emp.full_name,
			ret.approved_by_employee_id, aemp.full_name,
			ret.reason, ret.reason_type, ret.resolution_type,
			ret.replacement_product_id, ret.replacement_stock_id,
			rp.code, rp.name,
			ret.status, ret.total, ret.approved_at, ret.created_at
		FROM returns ret
		JOIN sales s ON s.id = ret.sale_id
		JOIN customers cust ON cust.id = ret.customer_id
		JOIN employees emp ON emp.id = ret.employee_id
		LEFT JOIN employees aemp ON aemp.id = ret.approved_by_employee_id
		LEFT JOIN products rp ON rp.id = ret.replacement_product_id
		%s
		ORDER BY ret.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]ReturnEntity, 0)
	for rows.Next() {
		var entity ReturnEntity
		if err := rows.Scan(
			&entity.ID, &entity.CompanyID, &entity.SaleID, &entity.SaleSerial,
			&entity.CustomerID, &entity.CustomerName,
			&entity.EmployeeID, &entity.EmployeeName,
			&entity.ApprovedByEmployeeID, &entity.ApprovedByName,
			&entity.Reason, &entity.ReasonType, &entity.ResolutionType,
			&entity.ReplacementProductID, &entity.ReplacementStockID,
			&entity.ReplacementProductCode, &entity.ReplacementProductName,
			&entity.Status, &entity.Total, &entity.ApprovedAt, &entity.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, entity)
	}

	return list, total, rows.Err()
}

func (r *ReturnRepository) Approve(ctx context.Context, q db.DBExecutor, id, approverEmployeeID int64) error {
	const sql = `
		UPDATE returns SET
			status = 'approved',
			approved_by_employee_id = $1,
			approved_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = 'pending'
	`
	cmdTag, err := q.Exec(ctx, sql, approverEmployeeID, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("la devolución no existe o ya no está en estado pendiente")
	}
	return nil
}

func (r *ReturnRepository) Reject(ctx context.Context, q db.DBExecutor, id, approverEmployeeID int64) error {
	const sql = `
		UPDATE returns SET
			status = 'rejected',
			approved_by_employee_id = $1,
			approved_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND status = 'pending'
	`
	cmdTag, err := q.Exec(ctx, sql, approverEmployeeID, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("la devolución no existe o ya no está en estado pendiente")
	}
	return nil
}
