package repositories

// sale_stock_repo · lo que un pedido toca de otras tablas: stock bloqueado, vendedor, pago por transferencia y transportadora
// conecta con: SaleRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_repo.go)

import (
	"context"
	"errors"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

// StockForSale es la ubicación de stock bloqueada para vender, con los datos del producto y sus tarifas (tier → precio, en JSON)
type StockForSale struct {
	ID          int64
	ProductID   int64
	WarehouseID int64
	Available   int
	Reserved    int
	ProductCode string
	ProductName string
	CostPrice   float64
	IVARate     float64
	PricesRaw   []byte
}

// LockStockForSale bloquea la fila de stock de la bodega (FOR UPDATE) y trae el producto y sus tarifas
func (r *SaleRepository) LockStockForSale(ctx context.Context, q db.DBExecutor, stockID, warehouseID int64) (*StockForSale, error) {
	const sql = `
		SELECT s.id, s.product_id, s.warehouse_id, s.available, s.reserved,
		       p.code, p.name, p.last_cost, COALESCE(p.iva, 0),
		       COALESCE((SELECT jsonb_object_agg(pp.price_tier, pp.price) FROM product_prices pp WHERE pp.product_id = p.id), '{}'::jsonb) AS prices
		FROM stock s
		JOIN products p ON p.id = s.product_id
		WHERE s.id = $1 AND s.warehouse_id = $2
		FOR UPDATE
	`
	var st StockForSale
	err := q.QueryRow(ctx, sql, stockID, warehouseID).Scan(
		&st.ID, &st.ProductID, &st.WarehouseID, &st.Available, &st.Reserved,
		&st.ProductCode, &st.ProductName, &st.CostPrice, &st.IVARate, &st.PricesRaw,
	)
	if err != nil {
		return nil, err
	}
	return &st, nil
}

// ActiveEmployeeExists dice si el empleado existe y está activo en la compañía (para asignarlo como vendedor)
func (r *SaleRepository) ActiveEmployeeExists(ctx context.Context, q db.DBExecutor, employeeID, companyID int64) (bool, error) {
	var exists bool
	err := q.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM employees WHERE id = $1 AND company_id = $2 AND status = 'active')", employeeID, companyID).Scan(&exists)
	return exists, err
}

// ActiveEmployeeInWarehouseExists dice si el empleado existe, está activo y pertenece a la bodega de la venta (o no tiene bodega fija como administradores)
func (r *SaleRepository) ActiveEmployeeInWarehouseExists(ctx context.Context, q db.DBExecutor, employeeID, companyID, warehouseID int64) (bool, error) {
	var exists bool
	err := q.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM employees 
			WHERE id = $1 AND company_id = $2 AND status = 'active' 
			  AND (warehouse_id = $3 OR warehouse_id IS NULL)
		)`, employeeID, companyID, warehouseID).Scan(&exists)
	return exists, err
}

// MarkQuotationConverted vincula la cotización a la venta creada y actualiza su estado a 'converted'.
func (r *SaleRepository) MarkQuotationConverted(ctx context.Context, q db.DBExecutor, quotationID, saleID int64) error {
	const sql = `UPDATE quotations SET status = 'converted', sale_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := q.Exec(ctx, sql, saleID, quotationID)
	return err
}

// InsertTransferPayment crea el pago por transferencia de un pedido, en revisión, con su comprobante y referencia
func (r *SaleRepository) InsertTransferPayment(ctx context.Context, q db.DBExecutor, companyID int64, serialCode string, saleID, customerID, employeeID int64, amount float64, proofURL, reference, notes *string) (int64, time.Time, error) {
	const sql = `
		INSERT INTO payments (
			company_id, serial_code, sale_id, customer_id, employee_id,
			method, amount, status, proof_url, reference, issue_note
		) VALUES (
			$1, $2, $3, $4, $5, 'transfer', $6, 'review', $7, $8, $9
		)
		RETURNING id, created_at
	`
	var id int64
	var createdAt time.Time
	err := q.QueryRow(ctx, sql, companyID, serialCode, saleID, customerID, employeeID, amount, proofURL, reference, notes).Scan(&id, &createdAt)
	return id, createdAt, err
}

// UpdateCarrier guarda la transportadora y la guía de la venta; lo que no se envía se conserva
func (r *SaleRepository) UpdateCarrier(ctx context.Context, q db.DBExecutor, saleID int64, carrierID *int64, trackingNo *string) error {
	const sql = `UPDATE sales SET carrier_id = COALESCE($1, carrier_id), tracking_no = COALESCE($2, tracking_no) WHERE id = $3`
	_, err := q.Exec(ctx, sql, carrierID, trackingNo, saleID)
	return err
}

// LinkedEmployeeOfAdmin devuelve el empleado ligado a un administrador (admins.employee_id), o 0 si no tiene
func (r *SaleRepository) LinkedEmployeeOfAdmin(ctx context.Context, q db.DBExecutor, adminID int64) (int64, error) {
	var employeeID *int64
	err := q.QueryRow(ctx, "SELECT employee_id FROM admins WHERE id = $1", adminID).Scan(&employeeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	if employeeID == nil {
		return 0, nil
	}
	return *employeeID, nil
}

// CountVerifiedPayments cuenta los pagos verificados de un pedido (un pedido con pagos verificados no se cancela sin revertirlos)
func (r *SaleRepository) CountVerifiedPayments(ctx context.Context, q db.DBExecutor, saleID int64) (int, error) {
	var n int
	err := q.QueryRow(ctx, "SELECT COUNT(*) FROM payments WHERE sale_id = $1 AND status = 'verified'", saleID).Scan(&n)
	return n, err
}

// CountInvoices cuenta las facturas emitidas de un pedido (no anuladas)
func (r *SaleRepository) CountInvoices(ctx context.Context, q db.DBExecutor, saleID int64) (int, error) {
	var n int
	err := q.QueryRow(ctx, "SELECT COUNT(*) FROM invoices WHERE sale_id = $1 AND status <> 'annulled'", saleID).Scan(&n)
	return n, err
}
