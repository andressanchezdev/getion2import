package repositories

// product_code_repo · códigos del producto
// conecta con: ProductRepository (mismo repositorio, repartido en varios archivos por responsabilidad; la estructura y el constructor están en product_repo.go)

import (
	"context"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
)

type ProductCodeEntity struct {
	ID        int64
	CompanyID int64
	ProductID int64
	CodeType  types.ProductCodeType
	Code      string
}

// ListCodes lista los códigos de un producto (barras, OEM y otros).
func (r *ProductRepository) ListCodes(ctx context.Context, q db.DBExecutor, productID int64) ([]ProductCodeEntity, error) {
	const sql = `
		SELECT id, company_id, product_id, code_type, code
		FROM product_codes
		WHERE product_id = $1
		ORDER BY id ASC
	`
	rows, err := q.Query(ctx, sql, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ProductCodeEntity
	for rows.Next() {
		var c ProductCodeEntity
		if err := rows.Scan(&c.ID, &c.CompanyID, &c.ProductID, &c.CodeType, &c.Code); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

// CreateCode agrega un código a un producto.
func (r *ProductRepository) CreateCode(ctx context.Context, q db.DBExecutor, companyID, productID int64, codeType types.ProductCodeType, code string) (*ProductCodeEntity, error) {
	const sql = `
		INSERT INTO product_codes (company_id, product_id, code_type, code)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	var c ProductCodeEntity
	c.CompanyID = companyID
	c.ProductID = productID
	c.CodeType = codeType
	c.Code = code

	err := q.QueryRow(ctx, sql, companyID, productID, codeType, code).Scan(&c.ID)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// DeleteCode quita un código de un producto.
func (r *ProductRepository) DeleteCode(ctx context.Context, q db.DBExecutor, codeID int64) error {
	const sql = `DELETE FROM product_codes WHERE id = $1`
	_, err := q.Exec(ctx, sql, codeID)
	return err
}
