package repositories

// product_supplier_repo · proveedores del producto y su costo
// conecta con: ProductRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_repo.go)

import (
	"context"

	"importadoraApi/src/core/db"
)

type ProductSupplierEntity struct {
	ProductID    int64
	SupplierID   int64
	SupplierName string
	Cost         float64
	SupplierCode *string
}

// ListSuppliers lista los proveedores de un producto con su costo.
func (r *ProductRepository) ListSuppliers(ctx context.Context, q db.DBExecutor, productID int64) ([]ProductSupplierEntity, error) {
	const sql = `
		SELECT
			ps.product_id, ps.supplier_id,
			COALESCE(s.name, ''), ps.cost, ps.supplier_code
		FROM product_suppliers ps
		LEFT JOIN externals s ON s.id = ps.supplier_id
		WHERE ps.product_id = $1
		ORDER BY ps.supplier_id ASC
	`
	rows, err := q.Query(ctx, sql, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ProductSupplierEntity
	for rows.Next() {
		var s ProductSupplierEntity
		if err := rows.Scan(&s.ProductID, &s.SupplierID, &s.SupplierName, &s.Cost, &s.SupplierCode); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

// AssignSupplier liga un proveedor a un producto con su costo, o actualiza el costo si ya estaba ligado.
func (r *ProductRepository) AssignSupplier(ctx context.Context, q db.DBExecutor, productID, supplierID int64, cost float64, supplierCode *string) error {
	const sql = `
		INSERT INTO product_suppliers (product_id, supplier_id, cost, supplier_code)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (product_id, supplier_id) DO UPDATE
		SET cost = EXCLUDED.cost, supplier_code = EXCLUDED.supplier_code
	`
	_, err := q.Exec(ctx, sql, productID, supplierID, cost, supplierCode)
	return err
}

// RemoveSupplier desliga un proveedor de un producto.
func (r *ProductRepository) RemoveSupplier(ctx context.Context, q db.DBExecutor, productID, supplierID int64) error {
	const sql = `DELETE FROM product_suppliers WHERE product_id = $1 AND supplier_id = $2`
	_, err := q.Exec(ctx, sql, productID, supplierID)
	return err
}
