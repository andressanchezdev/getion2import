package repositories

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"

	"github.com/jackc/pgx/v5"
)

type CartEntity struct {
	ID            int64
	UUID          string
	CompanyID     int64
	EmployeeID    *int64
	EmployeeName  *string
	CustomerID    *int64
	CustomerName  *string
	WarehouseID   *int64
	WarehouseName *string
	PriceTier     types.PriceTier
	Status        types.CartStatus
	ExpiresAt     time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type CartItemEntity struct {
	ID          int64
	CartID      int64
	ProductID   int64
	ProductCode string
	ProductName string
	StockID     int64
	Location    string
	Quantity    int
	UnitPrice   float64
	Discount    float64
}

type CartRepository struct{}

func NewCartRepository() *CartRepository {
	return &CartRepository{}
}

func (r *CartRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*CartEntity, error) {
	const sql = `
		SELECT
			c.id, c.uuid::text, c.company_id,
			c.employee_id, emp.full_name,
			c.customer_id, cust.name,
			c.warehouse_id, w.name,
			c.price_tier, c.status, c.expires_at, c.created_at, c.updated_at
		FROM carts c
		LEFT JOIN employees emp ON emp.id = c.employee_id
		LEFT JOIN customers cust ON cust.id = c.customer_id
		LEFT JOIN warehouses w ON w.id = c.warehouse_id
		WHERE c.id = $1
	`
	var c CartEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&c.ID, &c.UUID, &c.CompanyID,
		&c.EmployeeID, &c.EmployeeName,
		&c.CustomerID, &c.CustomerName,
		&c.WarehouseID, &c.WarehouseName,
		&c.PriceTier, &c.Status, &c.ExpiresAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CartRepository) FindActiveByEmployee(ctx context.Context, q db.DBExecutor, companyID, employeeID int64) (*CartEntity, error) {
	const sql = `
		SELECT
			c.id, c.uuid::text, c.company_id,
			c.employee_id, emp.full_name,
			c.customer_id, cust.name,
			c.warehouse_id, w.name,
			c.price_tier, c.status, c.expires_at, c.created_at, c.updated_at
		FROM carts c
		LEFT JOIN employees emp ON emp.id = c.employee_id
		LEFT JOIN customers cust ON cust.id = c.customer_id
		LEFT JOIN warehouses w ON w.id = c.warehouse_id
		WHERE c.company_id = $1 AND c.employee_id = $2 AND c.status = 'open' AND c.expires_at > CURRENT_TIMESTAMP
		ORDER BY c.updated_at DESC
		LIMIT 1
	`
	var c CartEntity
	err := q.QueryRow(ctx, sql, companyID, employeeID).Scan(
		&c.ID, &c.UUID, &c.CompanyID,
		&c.EmployeeID, &c.EmployeeName,
		&c.CustomerID, &c.CustomerName,
		&c.WarehouseID, &c.WarehouseName,
		&c.PriceTier, &c.Status, &c.ExpiresAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *CartRepository) Create(ctx context.Context, q db.DBExecutor, c *CartEntity) (*CartEntity, error) {
	const sql = `
		INSERT INTO carts (company_id, employee_id, customer_id, warehouse_id, price_tier, status)
		VALUES ($1, $2, $3, $4, $5, 'open')
		RETURNING id, uuid::text, expires_at, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		c.CompanyID, c.EmployeeID, c.CustomerID, c.WarehouseID, c.PriceTier,
	).Scan(&c.ID, &c.UUID, &c.ExpiresAt, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CartRepository) Update(ctx context.Context, q db.DBExecutor, c *CartEntity) error {
	const sql = `
		UPDATE carts SET
			customer_id = $1,
			warehouse_id = $2,
			price_tier = $3,
			status = $4,
			expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour',
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
	`
	_, err := q.Exec(ctx, sql, c.CustomerID, c.WarehouseID, c.PriceTier, c.Status, c.ID)
	return err
}

func (r *CartRepository) SetStatus(ctx context.Context, q db.DBExecutor, id int64, status types.CartStatus) error {
	const sql = `UPDATE carts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := q.Exec(ctx, sql, status, id)
	return err
}

func (r *CartRepository) Touch(ctx context.Context, q db.DBExecutor, cartID int64) error {
	const sql = `UPDATE carts SET expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour', updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := q.Exec(ctx, sql, cartID)
	return err
}

