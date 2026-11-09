package repositories

// product_thumbnail_repo.go · acceso a la base para las miniaturas de producto: la primera imagen de cada uno
// conecta con: core/db (DBExecutor); lo usa el service de miniaturas, que las pide por lote para pintar los renglones de pedidos, cotizaciones, compras y traslados

import (
	"context"

	"importadoraApi/src/core/db"
)

// ProductThumbnailEntity es la primera imagen de un producto (vacía si no tiene).
type ProductThumbnailEntity struct {
	ID       int64
	ImageURL string
}

// ListThumbnails devuelve la primera imagen de cada producto pedido; con companyID solo los de esa compañía.
func (r *ProductRepository) ListThumbnails(ctx context.Context, q db.DBExecutor, companyID *int64, ids []int64) ([]ProductThumbnailEntity, error) {
	const sql = `
		SELECT id, COALESCE(images[1], '')
		FROM products
		WHERE id = ANY($1) AND ($2::bigint IS NULL OR company_id = $2)
	`
	rows, err := q.Query(ctx, sql, ids, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ProductThumbnailEntity, 0, len(ids))
	for rows.Next() {
		var t ProductThumbnailEntity
		if err := rows.Scan(&t.ID, &t.ImageURL); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
