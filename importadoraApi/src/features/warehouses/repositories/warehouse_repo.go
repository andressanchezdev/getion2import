package repositories

// warehouse_repo.go · acceso a la base de bodegas: aquí vive el SQL; cada método recibe la conexión o la transacción
// conecta con: core/db (DBExecutor) y los dtos de bodegas; los usan los services de bodegas

import (
	"context"
	"errors"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type WarehouseEntity struct {
	ID                int64
	CompanyID         int64
	Code              string
	Name              string
	City              *string
	Address           *string
	Phone             *string
	Description       *string
	ManagerEmployeeID *int64
	ManagerName       *string
	LocationCount     int // ubicaciones de la bodega (solo lo llenan List y Search)
	SkuCount          int // productos distintos con existencias (solo lo llenan List y Search)
	IsActive          bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type WarehouseRepository struct{}

func isMissingSchemaElement(err error) bool {
	if err == nil {
		return false
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "42703" || pgErr.Code == "42P01"
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "does not exist") || strings.Contains(msg, "no existe")
}

func NewWarehouseRepository() *WarehouseRepository {
	return &WarehouseRepository{}
}

func (r *WarehouseRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*WarehouseEntity, error) {
	const sql = `
		SELECT
			w.id, w.company_id, w.code, w.name,
			w.city, w.address, w.phone, w.description,
			w.manager_employee_id,
			NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), '') AS manager_name,
			w.is_active, w.created_at, w.updated_at
		FROM warehouses w
		LEFT JOIN employees e ON w.manager_employee_id = e.id
		WHERE w.id = $1
	`
	var w WarehouseEntity
	err := q.QueryRow(ctx, sql, id).Scan(
		&w.ID, &w.CompanyID, &w.Code, &w.Name,
		&w.City, &w.Address, &w.Phone, &w.Description,
		&w.ManagerEmployeeID, &w.ManagerName,
		&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil && isMissingSchemaElement(err) {
		const fallback = `
			SELECT
				w.id, w.company_id, w.code, w.name,
				w.city, w.address, w.phone, w.description,
				NULL::BIGINT AS manager_employee_id,
				NULL::TEXT AS manager_name,
				w.is_active, w.created_at, w.updated_at
			FROM warehouses w
			WHERE w.id = $1
		`
		err = q.QueryRow(ctx, fallback, id).Scan(
			&w.ID, &w.CompanyID, &w.Code, &w.Name,
			&w.City, &w.Address, &w.Phone, &w.Description,
			&w.ManagerEmployeeID, &w.ManagerName,
			&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		)
	}
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &w, nil
}

func (r *WarehouseRepository) FindByCode(ctx context.Context, q db.DBExecutor, companyID int64, code string) (*WarehouseEntity, error) {
	const sql = `
		SELECT
			w.id, w.company_id, w.code, w.name,
			w.city, w.address, w.phone, w.description,
			w.manager_employee_id,
			NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), '') AS manager_name,
			w.is_active, w.created_at, w.updated_at
		FROM warehouses w
		LEFT JOIN employees e ON w.manager_employee_id = e.id
		WHERE w.company_id = $1 AND UPPER(TRIM(w.code)) = UPPER(TRIM($2))
	`
	var w WarehouseEntity
	err := q.QueryRow(ctx, sql, companyID, code).Scan(
		&w.ID, &w.CompanyID, &w.Code, &w.Name,
		&w.City, &w.Address, &w.Phone, &w.Description,
		&w.ManagerEmployeeID, &w.ManagerName,
		&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil && isMissingSchemaElement(err) {
		const fallback = `
			SELECT
				w.id, w.company_id, w.code, w.name,
				w.city, w.address, w.phone, w.description,
				NULL::BIGINT AS manager_employee_id,
				NULL::TEXT AS manager_name,
				w.is_active, w.created_at, w.updated_at
			FROM warehouses w
			WHERE w.company_id = $1 AND UPPER(TRIM(w.code)) = UPPER(TRIM($2))
		`
		err = q.QueryRow(ctx, fallback, companyID, code).Scan(
			&w.ID, &w.CompanyID, &w.Code, &w.Name,
			&w.City, &w.Address, &w.Phone, &w.Description,
			&w.ManagerEmployeeID, &w.ManagerName,
			&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		)
	}
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &w, nil
}

func (r *WarehouseRepository) List(ctx context.Context, q db.DBExecutor, companyID int64, params utils.PageParams) ([]WarehouseEntity, int, error) {
	var total int
	var rows pgx.Rows
	var err error

	if companyID > 0 {
		const countSQL = `SELECT COUNT(*) FROM warehouses WHERE company_id = $1`
		if err := q.QueryRow(ctx, countSQL, companyID).Scan(&total); err != nil {
			return nil, 0, err
		}

		const listSQL = `
			SELECT
				w.id, w.company_id, w.code, w.name,
				w.city, w.address, w.phone, w.description,
				w.manager_employee_id,
				NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), '') AS manager_name,
				w.is_active, w.created_at, w.updated_at,
				(SELECT COUNT(*) FROM warehouse_locations l WHERE l.warehouse_id = w.id) AS location_count,
				(SELECT COUNT(DISTINCT st.product_id) FROM stock st WHERE st.warehouse_id = w.id AND st.available > 0) AS sku_count
			FROM warehouses w
			LEFT JOIN employees e ON w.manager_employee_id = e.id
			WHERE w.company_id = $1
			ORDER BY w.id ASC
			LIMIT $2 OFFSET $3
		`
		rows, err = q.Query(ctx, listSQL, companyID, params.PageSize, params.Offset)
		if isMissingSchemaElement(err) {
			const fallbackSQL = `
				SELECT
					w.id, w.company_id, w.code, w.name,
					w.city, w.address, w.phone, w.description,
					NULL::BIGINT AS manager_employee_id,
					NULL::TEXT AS manager_name,
					w.is_active, w.created_at, w.updated_at,
					0 AS location_count,
					0 AS sku_count
				FROM warehouses w
				WHERE w.company_id = $1
				ORDER BY w.id ASC
				LIMIT $2 OFFSET $3
			`
			rows, err = q.Query(ctx, fallbackSQL, companyID, params.PageSize, params.Offset)
		}
	} else {
		const countSQL = `SELECT COUNT(*) FROM warehouses`
		if err := q.QueryRow(ctx, countSQL).Scan(&total); err != nil {
			return nil, 0, err
		}

		const listSQL = `
			SELECT
				w.id, w.company_id, w.code, w.name,
				w.city, w.address, w.phone, w.description,
				w.manager_employee_id,
				NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), '') AS manager_name,
				w.is_active, w.created_at, w.updated_at,
				(SELECT COUNT(*) FROM warehouse_locations l WHERE l.warehouse_id = w.id) AS location_count,
				(SELECT COUNT(DISTINCT st.product_id) FROM stock st WHERE st.warehouse_id = w.id AND st.available > 0) AS sku_count
			FROM warehouses w
			LEFT JOIN employees e ON w.manager_employee_id = e.id
			ORDER BY w.id ASC
			LIMIT $1 OFFSET $2
		`
		rows, err = q.Query(ctx, listSQL, params.PageSize, params.Offset)
		if isMissingSchemaElement(err) {
			const fallbackSQL = `
				SELECT
					w.id, w.company_id, w.code, w.name,
					w.city, w.address, w.phone, w.description,
					NULL::BIGINT AS manager_employee_id,
					NULL::TEXT AS manager_name,
					w.is_active, w.created_at, w.updated_at,
					0 AS location_count,
					0 AS sku_count
				FROM warehouses w
				ORDER BY w.id ASC
				LIMIT $1 OFFSET $2
			`
			rows, err = q.Query(ctx, fallbackSQL, params.PageSize, params.Offset)
		}
	}

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]WarehouseEntity, 0, params.PageSize)
	for rows.Next() {
		var w WarehouseEntity
		if err := rows.Scan(
			&w.ID, &w.CompanyID, &w.Code, &w.Name,
			&w.City, &w.Address, &w.Phone, &w.Description,
			&w.ManagerEmployeeID, &w.ManagerName,
			&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
			&w.LocationCount, &w.SkuCount,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, w)
	}

	return items, total, nil
}

func (r *WarehouseRepository) Search(ctx context.Context, q db.DBExecutor, companyID int64, query string, params utils.PageParams) ([]WarehouseEntity, int, error) {
	cleanQuery := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
	var total int
	var rows pgx.Rows
	var err error

	if companyID > 0 {
		const countSQL = `
			SELECT COUNT(*) FROM warehouses
			WHERE company_id = $1 AND (
				LOWER(code) LIKE $2 OR LOWER(name) LIKE $2 OR
				LOWER(COALESCE(city, '')) LIKE $2 OR LOWER(COALESCE(phone, '')) LIKE $2
			)
		`
		if err := q.QueryRow(ctx, countSQL, companyID, cleanQuery).Scan(&total); err != nil {
			return nil, 0, err
		}

		const searchSQL = `
			SELECT
				w.id, w.company_id, w.code, w.name,
				w.city, w.address, w.phone, w.description,
				w.manager_employee_id,
				NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), '') AS manager_name,
				w.is_active, w.created_at, w.updated_at,
				(SELECT COUNT(*) FROM warehouse_locations l WHERE l.warehouse_id = w.id) AS location_count,
				(SELECT COUNT(DISTINCT st.product_id) FROM stock st WHERE st.warehouse_id = w.id AND st.available > 0) AS sku_count
			FROM warehouses w
			LEFT JOIN employees e ON w.manager_employee_id = e.id
			WHERE w.company_id = $1 AND (
				LOWER(w.code) LIKE $2 OR LOWER(w.name) LIKE $2 OR
				LOWER(COALESCE(w.city, '')) LIKE $2 OR LOWER(COALESCE(w.phone, '')) LIKE $2
			)
			ORDER BY w.code ASC
			LIMIT $3 OFFSET $4
		`
		rows, err = q.Query(ctx, searchSQL, companyID, cleanQuery, params.PageSize, params.Offset)
		if isMissingSchemaElement(err) {
			const fallbackSQL = `
				SELECT
					w.id, w.company_id, w.code, w.name,
					w.city, w.address, w.phone, w.description,
					NULL::BIGINT AS manager_employee_id,
					NULL::TEXT AS manager_name,
					w.is_active, w.created_at, w.updated_at,
					0 AS location_count,
					0 AS sku_count
				FROM warehouses w
				WHERE w.company_id = $1 AND (
					LOWER(w.code) LIKE $2 OR LOWER(w.name) LIKE $2 OR
					LOWER(COALESCE(w.city, '')) LIKE $2 OR LOWER(COALESCE(w.phone, '')) LIKE $2
				)
				ORDER BY w.code ASC
				LIMIT $3 OFFSET $4
			`
			rows, err = q.Query(ctx, fallbackSQL, companyID, cleanQuery, params.PageSize, params.Offset)
		}
	} else {
		const countSQL = `
			SELECT COUNT(*) FROM warehouses
			WHERE (
				LOWER(code) LIKE $1 OR LOWER(name) LIKE $1 OR
				LOWER(COALESCE(city, '')) LIKE $1 OR LOWER(COALESCE(phone, '')) LIKE $1
			)
		`
		if err := q.QueryRow(ctx, countSQL, cleanQuery).Scan(&total); err != nil {
			return nil, 0, err
		}

		const searchSQL = `
			SELECT
				w.id, w.company_id, w.code, w.name,
				w.city, w.address, w.phone, w.description,
				w.manager_employee_id,
				NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), '') AS manager_name,
				w.is_active, w.created_at, w.updated_at,
				(SELECT COUNT(*) FROM warehouse_locations l WHERE l.warehouse_id = w.id) AS location_count,
				(SELECT COUNT(DISTINCT st.product_id) FROM stock st WHERE st.warehouse_id = w.id AND st.available > 0) AS sku_count
			FROM warehouses w
			LEFT JOIN employees e ON w.manager_employee_id = e.id
			WHERE (
				LOWER(w.code) LIKE $1 OR LOWER(w.name) LIKE $1 OR
				LOWER(COALESCE(w.city, '')) LIKE $1 OR LOWER(COALESCE(w.phone, '')) LIKE $1
			)
			ORDER BY w.code ASC
			LIMIT $2 OFFSET $3
		`
		rows, err = q.Query(ctx, searchSQL, cleanQuery, params.PageSize, params.Offset)
		if isMissingSchemaElement(err) {
			const fallbackSQL = `
				SELECT
					w.id, w.company_id, w.code, w.name,
					w.city, w.address, w.phone, w.description,
					NULL::BIGINT AS manager_employee_id,
					NULL::TEXT AS manager_name,
					w.is_active, w.created_at, w.updated_at,
					0 AS location_count,
					0 AS sku_count
				FROM warehouses w
				WHERE (
					LOWER(w.code) LIKE $1 OR LOWER(w.name) LIKE $1 OR
					LOWER(COALESCE(w.city, '')) LIKE $1 OR LOWER(COALESCE(w.phone, '')) LIKE $1
				)
				ORDER BY w.code ASC
				LIMIT $2 OFFSET $3
			`
			rows, err = q.Query(ctx, fallbackSQL, cleanQuery, params.PageSize, params.Offset)
		}
	}

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]WarehouseEntity, 0, params.PageSize)
	for rows.Next() {
		var w WarehouseEntity
		if err := rows.Scan(
			&w.ID, &w.CompanyID, &w.Code, &w.Name,
			&w.City, &w.Address, &w.Phone, &w.Description,
			&w.ManagerEmployeeID, &w.ManagerName,
			&w.IsActive, &w.CreatedAt, &w.UpdatedAt,
			&w.LocationCount, &w.SkuCount,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, w)
	}

	return items, total, nil
}

func (r *WarehouseRepository) Create(ctx context.Context, q db.DBExecutor, w *WarehouseEntity) (*WarehouseEntity, error) {
	const sql = `
		INSERT INTO warehouses (
			company_id, code, name, city, address, phone, description, manager_employee_id, is_active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	err := q.QueryRow(
		ctx, sql,
		w.CompanyID, w.Code, w.Name, w.City, w.Address, w.Phone, w.Description, w.ManagerEmployeeID, w.IsActive,
	).Scan(&w.ID, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *WarehouseRepository) Update(ctx context.Context, q db.DBExecutor, w *WarehouseEntity) (*WarehouseEntity, error) {
	const sql = `
		UPDATE warehouses
		SET
			code = $1,
			name = $2,
			city = $3,
			address = $4,
			phone = $5,
			description = $6,
			manager_employee_id = $7,
			is_active = $8,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $9
		RETURNING updated_at
	`
	err := q.QueryRow(
		ctx, sql,
		w.Code, w.Name, w.City, w.Address, w.Phone, w.Description, w.ManagerEmployeeID, w.IsActive, w.ID,
	).Scan(&w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *WarehouseRepository) Deactivate(ctx context.Context, q db.DBExecutor, id int64) error {
	const sql = `
		UPDATE warehouses
		SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := q.Exec(ctx, sql, id)
	return err
}
