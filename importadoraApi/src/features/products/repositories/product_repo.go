package repositories

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
	Images       []string
	Easysearch   *string
	Status       types.ProductStatus
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time
}

type ProductCodeEntity struct {
	ID        int64
	CompanyID int64
	ProductID int64
	CodeType  types.ProductCodeType
	Code      string
}

type ProductSupplierEntity struct {
	ProductID    int64
	SupplierID   int64
	SupplierName string
	Cost         float64
	SupplierCode *string
}

type ProductRepository struct{}

func NewProductRepository() *ProductRepository {
	return &ProductRepository{}
}

func (r *ProductRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*ProductEntity, error) {
	const sql = `
		SELECT
			p.id, p.uuid::text, p.company_id,
			p.category_id, COALESCE(cat.name, ''),
			p.brand_id, b.name,
			p.model_id, m.name,
			p.code, p.name, p.description, p.unit, p.iva,
			p.prices, p.last_cost, p.is_promotion, p.images,
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
		&p.Prices, &p.LastCost, &p.IsPromotion, &p.Images,
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

func (r *ProductRepository) FindByCompanyAndCode(ctx context.Context, q db.DBExecutor, companyID int64, code string) (*ProductEntity, error) {
	const sql = `
		SELECT
			p.id, p.uuid::text, p.company_id,
			p.category_id, COALESCE(cat.name, ''),
			p.brand_id, b.name,
			p.model_id, m.name,
			p.code, p.name, p.description, p.unit, p.iva,
			p.prices, p.last_cost, p.is_promotion, p.images,
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
		&p.Prices, &p.LastCost, &p.IsPromotion, &p.Images,
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
			p.prices, p.last_cost, p.is_promotion, p.images,
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
			&p.Prices, &p.LastCost, &p.IsPromotion, &p.Images,
			&p.Easysearch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, p)
	}

	return list, total, rows.Err()
}

func (r *ProductRepository) Create(ctx context.Context, q db.DBExecutor, p *ProductEntity) (*ProductEntity, error) {
	if len(p.Prices) == 0 {
		p.Prices = []byte(`{"p1":0,"p2":0,"p3":0,"p4":0}`)
	}
	if p.Images == nil {
		p.Images = []string{}
	}

	const sql = `
		INSERT INTO products (
			company_id, category_id, brand_id, model_id,
			code, name, description, unit, iva, prices,
			last_cost, is_promotion, images, easysearch, status
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15
		)
		RETURNING id, uuid::text, easysearch, created_at, updated_at
	`
	err := q.QueryRow(ctx, sql,
		p.CompanyID, p.CategoryID, p.BrandID, p.ModelID,
		p.Code, p.Name, p.Description, p.Unit, p.IVA, p.Prices,
		p.LastCost, p.IsPromotion, p.Images, p.Easysearch, p.Status,
	).Scan(&p.ID, &p.UUID, &p.Easysearch, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

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
			prices = $9,
			last_cost = $10,
			is_promotion = $11,
			images = $12,
			easysearch = $13,
			status = $14,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $15 AND deleted_at IS NULL
		RETURNING easysearch, updated_at
	`
	err := q.QueryRow(ctx, sql,
		p.CategoryID, p.BrandID, p.ModelID,
		p.Code, p.Name, p.Description, p.Unit, p.IVA, p.Prices,
		p.LastCost, p.IsPromotion, p.Images, p.Easysearch, p.Status, p.ID,
	).Scan(&p.Easysearch, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProductRepository) SoftDelete(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `
		UPDATE products SET
			deleted_at = CURRENT_TIMESTAMP,
			status = 'inactive',
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`
	cmdTag, err := q.Exec(ctx, sql, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("producto no encontrado o ya eliminado")
	}
	return nil
}

// ==========================================
// MÉTODOS PARA CÓDIGOS DE PRODUCTO
// ==========================================

func (r *ProductRepository) ListCodes(ctx context.Context, q db.DBExecutor, productID int64) ([]ProductCodeEntity, error) {
	const sql = `SELECT id, company_id, product_id, code_type, code FROM product_codes WHERE product_id = $1 ORDER BY id ASC`
	rows, err := q.Query(ctx, sql, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	codes := make([]ProductCodeEntity, 0)
	for rows.Next() {
		var c ProductCodeEntity
		if err := rows.Scan(&c.ID, &c.CompanyID, &c.ProductID, &c.CodeType, &c.Code); err != nil {
			return nil, err
		}
		codes = append(codes, c)
	}
	return codes, rows.Err()
}

func (r *ProductRepository) CreateCode(ctx context.Context, q db.DBExecutor, companyID, productID int64, codeType types.ProductCodeType, code string) (*ProductCodeEntity, error) {
	const sql = `
		INSERT INTO product_codes (company_id, product_id, code_type, code)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	var id int64
	err := q.QueryRow(ctx, sql, companyID, productID, codeType, code).Scan(&id)
	if err != nil {
		return nil, err
	}
	return &ProductCodeEntity{
		ID:        id,
		CompanyID: companyID,
		ProductID: productID,
		CodeType:  codeType,
		Code:      code,
	}, nil
}

func (r *ProductRepository) DeleteCode(ctx context.Context, q db.DBExecutor, codeID int64) error {
	const sql = `DELETE FROM product_codes WHERE id = $1`
	cmdTag, err := q.Exec(ctx, sql, codeID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("código de producto no encontrado")
	}
	return nil
}

// ==========================================
// MÉTODOS PARA PROVEEDORES DEL PRODUCTO
// ==========================================

func (r *ProductRepository) ListSuppliers(ctx context.Context, q db.DBExecutor, productID int64) ([]ProductSupplierEntity, error) {
	const sql = `
		SELECT ps.product_id, ps.supplier_id, COALESCE(ext.name, ''), ps.cost, ps.supplier_code
		FROM product_suppliers ps
		LEFT JOIN externals ext ON ext.id = ps.supplier_id
		WHERE ps.product_id = $1
		ORDER BY ext.name ASC
	`
	rows, err := q.Query(ctx, sql, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	suppliers := make([]ProductSupplierEntity, 0)
	for rows.Next() {
		var s ProductSupplierEntity
		if err := rows.Scan(&s.ProductID, &s.SupplierID, &s.SupplierName, &s.Cost, &s.SupplierCode); err != nil {
			return nil, err
		}
		suppliers = append(suppliers, s)
	}
	return suppliers, rows.Err()
}

func (r *ProductRepository) AssignSupplier(ctx context.Context, q db.DBExecutor, productID, supplierID int64, cost float64, supplierCode *string) error {
	const sql = `
		INSERT INTO product_suppliers (product_id, supplier_id, cost, supplier_code)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (product_id, supplier_id)
		DO UPDATE SET cost = EXCLUDED.cost, supplier_code = EXCLUDED.supplier_code
	`
	_, err := q.Exec(ctx, sql, productID, supplierID, cost, supplierCode)
	return err
}

func (r *ProductRepository) RemoveSupplier(ctx context.Context, q db.DBExecutor, productID, supplierID int64) error {
	const sql = `DELETE FROM product_suppliers WHERE product_id = $1 AND supplier_id = $2`
	cmdTag, err := q.Exec(ctx, sql, productID, supplierID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("proveedor no asignado al producto")
	}
	return nil
}
