package repositories

// product_repo.go · acceso a la base de productos: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de productos; los usan los services de productos

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/types"
	"importadoraApi/src/features/products/dtos"

	"github.com/jackc/pgx/v5"
)

type ProductEntity struct {
	ID           int64
	UUID         string
	CompanyID    int64
	CategoryID   int64
	CategoryName string
	BrandID      *int64
	BrandName    *string
	ModelID      *int64
	ModelName    *string
	Code         string
	Name         string
	Description  *string
	Unit         string
	IVA          *float64
	Prices       []byte
	LastCost     float64
	IsPromotion  bool
	IsNew        bool
	Images       []string
	Easysearch   *string
	Status       types.ProductStatus
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time
}

type ProductRepository struct{}

// NewProductRepository crea el repositorio; no guarda estado, cada método recibe la conexión o transacción.
func NewProductRepository() *ProductRepository {
	return &ProductRepository{}
}

// FindByID busca el producto por su id (nil si no existe).
func (r *ProductRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*ProductEntity, error) {
	const sql = `
		SELECT
			p.id, p.uuid::text, p.company_id,
			p.category_id, COALESCE(cat.name, ''),
			p.brand_id, b.name,
			p.model_id, m.name,
			p.code, p.name, p.description, p.unit, p.iva,
			COALESCE((SELECT jsonb_object_agg(pp.price_tier, pp.price) FROM product_prices pp WHERE pp.product_id = p.id), '{}'::jsonb) AS prices,
			p.last_cost, p.is_promotion, p.is_new, p.images,
			p.easysearch, p.status, p.created_at, p.updated_at, p.deleted_at
		FROM products p
		LEFT JOIN categories cat ON cat.id = p.category_id
		LEFT JOIN brands b ON b.id = p.brand_id
		LEFT JOIN models m ON m.id = p.model_id
		WHERE p.id = $1 AND p.deleted_at IS NULL
	`
	var p ProductEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&p.ID, &p.UUID, &p.CompanyID,
		&p.CategoryID, &p.CategoryName,
		&p.BrandID, &p.BrandName,
		&p.ModelID, &p.ModelName,
		&p.Code, &p.Name, &p.Description, &p.Unit, &p.IVA,
		&p.Prices, &p.LastCost, &p.IsPromotion, &p.IsNew, &p.Images,
		&p.Easysearch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

// FindByCompanyAndCode busca el producto por compañía y código (nil si no existe).
func (r *ProductRepository) FindByCompanyAndCode(ctx context.Context, q db.DBExecutor, companyID int64, code string) (*ProductEntity, error) {
	const sql = `
		SELECT
			p.id, p.uuid::text, p.company_id,
			p.category_id, COALESCE(cat.name, ''),
			p.brand_id, b.name,
			p.model_id, m.name,
			p.code, p.name, p.description, p.unit, p.iva,
			COALESCE((SELECT jsonb_object_agg(pp.price_tier, pp.price) FROM product_prices pp WHERE pp.product_id = p.id), '{}'::jsonb) AS prices,
			p.last_cost, p.is_promotion, p.is_new, p.images,
			p.easysearch, p.status, p.created_at, p.updated_at, p.deleted_at
		FROM products p
		LEFT JOIN categories cat ON cat.id = p.category_id
		LEFT JOIN brands b ON b.id = p.brand_id
		LEFT JOIN models m ON m.id = p.model_id
		WHERE p.company_id = $1 AND p.code = $2 AND p.deleted_at IS NULL
	`
	var p ProductEntity
	err := q.QueryRow(ctx, sql, companyID, code).Scan(
		&p.ID, &p.UUID, &p.CompanyID,
		&p.CategoryID, &p.CategoryName,
		&p.BrandID, &p.BrandName,
		&p.ModelID, &p.ModelName,
		&p.Code, &p.Name, &p.Description, &p.Unit, &p.IVA,
		&p.Prices, &p.LastCost, &p.IsPromotion, &p.IsNew, &p.Images,
		&p.Easysearch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

// List lista los productos según los filtros, con su total para paginar.
func (r *ProductRepository) List(ctx context.Context, q db.DBExecutor, f dtos.ProductFilterQuery) ([]ProductEntity, int, error) {
	where := []string{"p.deleted_at IS NULL"}
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("p.company_id = $%d", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if f.CategoryID != nil {
		where = append(where, fmt.Sprintf("p.category_id = $%d", argIdx))
		args = append(args, *f.CategoryID)
		argIdx++
	}

	if f.BrandID != nil {
		where = append(where, fmt.Sprintf("p.brand_id = $%d", argIdx))
		args = append(args, *f.BrandID)
		argIdx++
	}

	if f.ModelID != nil {
		where = append(where, fmt.Sprintf("p.model_id = $%d", argIdx))
		args = append(args, *f.ModelID)
		argIdx++
	}

	if f.Status != nil && *f.Status != "" {
		where = append(where, fmt.Sprintf("p.status = $%d", argIdx))
		args = append(args, *f.Status)
		argIdx++
	}

	if f.IsPromotion != nil {
		where = append(where, fmt.Sprintf("p.is_promotion = $%d", argIdx))
		args = append(args, *f.IsPromotion)
		argIdx++
	}

	// Búsqueda rápida sobre easysearch (o fallback a name/code)
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(p.easysearch ILIKE $%d OR p.name ILIKE $%d OR p.code ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}

	whereClause := "WHERE " + strings.Join(where, " AND ")

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM products p %s", whereClause)
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
			p.id, p.uuid::text, p.company_id,
			p.category_id, COALESCE(cat.name, ''),
			p.brand_id, b.name,
			p.model_id, m.name,
			p.code, p.name, p.description, p.unit, p.iva,
			COALESCE((SELECT jsonb_object_agg(pp.price_tier, pp.price) FROM product_prices pp WHERE pp.product_id = p.id), '{}'::jsonb) AS prices,
			p.last_cost, p.is_promotion, p.is_new, p.images,
			p.easysearch, p.status, p.created_at, p.updated_at, p.deleted_at
		FROM products p
		LEFT JOIN categories cat ON cat.id = p.category_id
		LEFT JOIN brands b ON b.id = p.brand_id
		LEFT JOIN models m ON m.id = p.model_id
		%s
		ORDER BY p.id ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]ProductEntity, 0)
	for rows.Next() {
		var p ProductEntity
		if err := rows.Scan(
			&p.ID, &p.UUID, &p.CompanyID,
			&p.CategoryID, &p.CategoryName,
			&p.BrandID, &p.BrandName,
			&p.ModelID, &p.ModelName,
			&p.Code, &p.Name, &p.Description, &p.Unit, &p.IVA,
			&p.Prices, &p.LastCost, &p.IsPromotion, &p.IsNew, &p.Images,
			&p.Easysearch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, p)
	}

	return list, total, rows.Err()
}

// Create inserta el producto y devuelve el registro guardado.
func (r *ProductRepository) Create(ctx context.Context, q db.DBExecutor, p *ProductEntity) (*ProductEntity, error) {
	if p.Images == nil {
		p.Images = []string{}
	}

	const sql = `
		INSERT INTO products (
			company_id, category_id, brand_id, model_id,
			code, name, description, unit, iva,
			last_cost, is_promotion, is_new, images, easysearch, status
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15
		)
		RETURNING id, uuid::text, easysearch, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		p.CompanyID, p.CategoryID, p.BrandID, p.ModelID,
		p.Code, p.Name, p.Description, p.Unit, p.IVA,
		p.LastCost, p.IsPromotion, p.IsNew, p.Images, p.Easysearch, p.Status,
	).Scan(&p.ID, &p.UUID, &p.Easysearch, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// Update actualiza los datos de el producto.
func (r *ProductRepository) Update(ctx context.Context, q db.DBExecutor, p *ProductEntity) (*ProductEntity, error) {
	const sql = `
		UPDATE products SET
			category_id = $1,
			brand_id = $2,
			model_id = $3,
			code = $4,
			name = $5,
			description = $6,
			unit = $7,
			iva = $8,
			last_cost = $9,
			is_promotion = $10,
			is_new = $11,
			images = $12,
			easysearch = $13,
			status = $14,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $15 AND deleted_at IS NULL
		RETURNING easysearch, updated_at
	`
	err := q.QueryRow(ctx, sql,
		p.CategoryID, p.BrandID, p.ModelID,
		p.Code, p.Name, p.Description, p.Unit, p.IVA,
		p.LastCost, p.IsPromotion, p.IsNew, p.Images, p.Easysearch, p.Status, p.ID,
	).Scan(&p.Easysearch, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// UpsertPrices guarda las tarifas del producto (p1 a p4): crea las que faltan y actualiza las que ya existen.
func (r *ProductRepository) UpsertPrices(ctx context.Context, q db.DBExecutor, companyID, productID int64, prices map[string]float64) error {
	for tier, price := range prices {
		const sql = `
			INSERT INTO product_prices (company_id, product_id, price_tier, price)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (product_id, price_tier) DO UPDATE
			SET price = EXCLUDED.price, updated_at = CURRENT_TIMESTAMP
		`
		if _, err := q.Exec(ctx, sql, companyID, productID, tier, price); err != nil {
			return err
		}
	}
	return nil
}

// SoftDelete marca el producto como eliminado (borrado lógico: no se pierde el registro).
func (r *ProductRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `
		UPDATE products SET
			deleted_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`
	_, err := q.Exec(ctx, sql, id)
	return err
}
