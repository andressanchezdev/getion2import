package repositories

// sale_stock_repo · lo que un pedido toca de otras tablas: stock bloqueado, vendedor, pago por transferencia y transportadora
// conecta con: SaleRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en sale_repo.go)

import (
	"context"

	"importadoraApi/src/core/db"
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

// InsertTransferPayment crea el pago por transferencia de un pedido, en revisión, con su comprobante y referencia
func (r *SaleRepository) InsertTransferPayment(ctx context.Context, q db.DBExecutor, companyID int64, serialCode string, saleID, customerID, employeeID int64, amount float64, proofURL, reference, notes *string) error {
	const sql = `
		INSERT INTO payments (
			company_id, serial_code, sale_id, customer_id, employee_id,
			method, amount, status, proof_url, reference, issue_note
		) VALUES (
			$1, $2, $3, $4, $5, 'transfer', $6, 'review', $7, $8, $9
		)
	`
	_, err := q.Exec(ctx, sql, companyID, serialCode, saleID, customerID, employeeID, amount, proofURL, reference, notes)
	return err
}

// UpdateCarrier guarda la transportadora y la guía de la venta; lo que no se envía se conserva
func (r *SaleRepository) UpdateCarrier(ctx context.Context, q db.DBExecutor, saleID int64, carrierID *int64, trackingNo *string) error {
	const sql = `UPDATE sales SET carrier_id = COALESCE($1, carrier_id), tracking_no = COALESCE($2, tracking_no) WHERE id = $3`
	_, err := q.Exec(ctx, sql, carrierID, trackingNo, saleID)
	return err
}
