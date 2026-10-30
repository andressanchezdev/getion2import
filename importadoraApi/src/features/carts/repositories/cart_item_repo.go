package repositories

import (
	"context"
	"errors"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/carts/dtos"

	"github.com/jackc/pgx/v5"
)

func (r *CartRepository) ListItems(ctx context.Context, q db.DBExecutor, cartID int64) ([]dtos.CartItemResponse, error) {
	const sql = `
		SELECT
			ci.id, ci.cart_id, ci.product_id, COALESCE(p.code, ''), COALESCE(p.name, ''),
			ci.stock_id, COALESCE(s.location, ''),
			ci.quantity, ci.unit_price, ci.discount,
			(ci.quantity * ci.unit_price - ci.discount) AS line_total
		FROM cart_items ci
		JOIN products p ON p.id = ci.product_id
		JOIN stock s ON s.id = ci.stock_id
		WHERE ci.cart_id = $1
		ORDER BY ci.id ASC
	`
	rows, err := q.Query(ctx, sql, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]dtos.CartItemResponse, 0)
	for rows.Next() {
		var item dtos.CartItemResponse
		if err := rows.Scan(
			&item.ID, &item.CartID, &item.ProductID, &item.ProductCode, &item.ProductName,
			&item.StockID, &item.Location,
			&item.Quantity, &item.UnitPrice, &item.Discount, &item.LineTotal,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *CartRepository) FindItemByID(ctx context.Context, q db.DBExecutor, itemID int64) (*CartItemEntity, error) {
	const sql = `
		SELECT
			ci.id, ci.cart_id, ci.product_id, p.code, p.name,
			ci.stock_id, s.location, ci.quantity, ci.unit_price, ci.discount
		FROM cart_items ci
		JOIN products p ON p.id = ci.product_id
		JOIN stock s ON s.id = ci.stock_id
		WHERE ci.id = $1
	`
	var item CartItemEntity
	err := q.QueryRow(ctx, sql, itemID).Scan(
		&item.ID, &item.CartID, &item.ProductID, &item.ProductCode, &item.ProductName,
		&item.StockID, &item.Location, &item.Quantity, &item.UnitPrice, &item.Discount,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *CartRepository) UpsertItem(ctx context.Context, q db.DBExecutor, cartID, productID, stockID int64, quantity int, unitPrice, discount float64) error {
	const sql = `
		INSERT INTO cart_items (cart_id, product_id, stock_id, quantity, unit_price, discount)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (cart_id, stock_id)
		DO UPDATE SET
			quantity = cart_items.quantity + EXCLUDED.quantity,
			unit_price = EXCLUDED.unit_price,
			discount = EXCLUDED.discount
	`
	_, err := q.Exec(ctx, sql, cartID, productID, stockID, quantity, unitPrice, discount)
	return err
}

func (r *CartRepository) UpdateItem(ctx context.Context, q db.DBExecutor, itemID int64, quantity int, unitPrice, discount float64) error {
	const sql = `
		UPDATE cart_items SET
			quantity = $1,
			unit_price = $2,
			discount = $3
		WHERE id = $4
	`
	cmdTag, err := q.Exec(ctx, sql, quantity, unitPrice, discount, itemID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("ítem no encontrado")
	}
	return nil
}

func (r *CartRepository) DeleteItem(ctx context.Context, q db.DBExecutor, itemID int64) error {
	const sql = `DELETE FROM cart_items WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, itemID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("ítem no encontrado")
	}
	return nil
}

func (r *CartRepository) ClearItems(ctx context.Context, q db.DBExecutor, cartID int64) error {
	const sql = `DELETE FROM cart_items WHERE cart_id = $1`
	_, err := q.Exec(ctx, sql, cartID)
	return err
}

