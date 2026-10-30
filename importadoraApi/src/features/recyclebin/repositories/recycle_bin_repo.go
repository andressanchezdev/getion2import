package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/features/recyclebin/dtos"

	"github.com/jackc/pgx/v5"
)

type RecycleBinEntity struct {
	ID                  int64
	CompanyID           *int64
	EntityTable         string
	EntityID            int64
	EntityLabel         string
	EntityData          []byte
	DeletedByActorType  string
	DeletedByActorID    int64
	DeletedByActorName  string
	DeletedAt           time.Time
	IsRestored          bool
	RestoredAt          *time.Time
	RestoredByActorID   *int64
	RestoredByActorName *string
}

type RecycleBinRepository struct{}

func NewRecycleBinRepository() *RecycleBinRepository {
	return &RecycleBinRepository{}
}

func (r *RecycleBinRepository) Insert(ctx context.Context, q db.DBExecutor, companyID *int64, table string, entityID int64, label string, data []byte, actorType string, actorID int64) (int64, error) {
	const sql = `
		INSERT INTO recycle_bin (
			company_id, entity_table, entity_id, entity_label, entity_data,
			deleted_by_actor_type, deleted_by_actor_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	var id int64
	err := q.QueryRow(ctx, sql, companyID, table, entityID, label, data, actorType, actorID).Scan(&id)
	return id, err
}

func (r *RecycleBinRepository) FindByID(ctx context.Context, q db.DBExecutor, id int64) (*RecycleBinEntity, error) {
	const sql = `
		SELECT
			rb.id, rb.company_id, rb.entity_table, rb.entity_id, rb.entity_label, rb.entity_data,
			rb.deleted_by_actor_type, rb.deleted_by_actor_id,
			COALESCE(sa.full_name, ad.full_name, emp.full_name, 'Usuario') AS deleted_name,
			rb.deleted_at, rb.is_restored, rb.restored_at, rb.restored_by_actor_id,
			COALESCE(rsa.full_name, rad.full_name, remp.full_name, '') AS restored_name
		FROM recycle_bin rb
		LEFT JOIN superadmins sa ON sa.id = rb.deleted_by_actor_id AND rb.deleted_by_actor_type = 'superadmin'
		LEFT JOIN admins ad ON ad.id = rb.deleted_by_actor_id AND rb.deleted_by_actor_type = 'admin'
		LEFT JOIN employees emp ON emp.id = rb.deleted_by_actor_id AND rb.deleted_by_actor_type = 'employee'
		LEFT JOIN superadmins rsa ON rsa.id = rb.restored_by_actor_id
		LEFT JOIN admins rad ON rad.id = rb.restored_by_actor_id
		LEFT JOIN employees remp ON remp.id = rb.restored_by_actor_id
		WHERE rb.id = $1
	`
	var e RecycleBinEntity
	var restoredName string
	err := q.QueryRow(ctx, sql, id).Scan(
		&e.ID, &e.CompanyID, &e.EntityTable, &e.EntityID, &e.EntityLabel, &e.EntityData,
		&e.DeletedByActorType, &e.DeletedByActorID, &e.DeletedByActorName,
		&e.DeletedAt, &e.IsRestored, &e.RestoredAt, &e.RestoredByActorID, &restoredName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if restoredName != "" {
		e.RestoredByActorName = &restoredName
	}
	return &e, nil
}

func (r *RecycleBinRepository) List(ctx context.Context, q db.DBExecutor, f dtos.RecycleBinFilterQuery) ([]RecycleBinEntity, int, error) {
	where := make([]string, 0)
	args := make([]interface{}, 0)
	argIdx := 1

	if f.CompanyID != nil {
		where = append(where, fmt.Sprintf("(rb.company_id = $%d OR rb.company_id IS NULL)", argIdx))
		args = append(args, *f.CompanyID)
		argIdx++
	}

	if strings.TrimSpace(f.EntityTable) != "" {
		where = append(where, fmt.Sprintf("rb.entity_table = $%d", argIdx))
		args = append(args, strings.TrimSpace(f.EntityTable))
		argIdx++
	}

	if f.IsRestored != nil {
		where = append(where, fmt.Sprintf("rb.is_restored = $%d", argIdx))
		args = append(args, *f.IsRestored)
		argIdx++
	}

	if strings.TrimSpace(f.Search) != "" {
		where = append(where, fmt.Sprintf("(rb.entity_label ILIKE $%d OR rb.entity_table ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+strings.TrimSpace(f.Search)+"%")
		argIdx++
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM recycle_bin rb %s`, whereClause)
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
			rb.id, rb.company_id, rb.entity_table, rb.entity_id, rb.entity_label, rb.entity_data,
			rb.deleted_by_actor_type, rb.deleted_by_actor_id,
			COALESCE(sa.full_name, ad.full_name, emp.full_name, 'Usuario') AS deleted_name,
			rb.deleted_at, rb.is_restored, rb.restored_at, rb.restored_by_actor_id,
			COALESCE(rsa.full_name, rad.full_name, remp.full_name, '') AS restored_name
		FROM recycle_bin rb
		LEFT JOIN superadmins sa ON sa.id = rb.deleted_by_actor_id AND rb.deleted_by_actor_type = 'superadmin'
		LEFT JOIN admins ad ON ad.id = rb.deleted_by_actor_id AND rb.deleted_by_actor_type = 'admin'
		LEFT JOIN employees emp ON emp.id = rb.deleted_by_actor_id AND rb.deleted_by_actor_type = 'employee'
		LEFT JOIN superadmins rsa ON rsa.id = rb.restored_by_actor_id
		LEFT JOIN admins rad ON rad.id = rb.restored_by_actor_id
		LEFT JOIN employees remp ON remp.id = rb.restored_by_actor_id
		%s
		ORDER BY rb.deleted_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := q.Query(ctx, selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]RecycleBinEntity, 0)
	for rows.Next() {
		var e RecycleBinEntity
		var restoredName string
		if err := rows.Scan(
			&e.ID, &e.CompanyID, &e.EntityTable, &e.EntityID, &e.EntityLabel, &e.EntityData,
			&e.DeletedByActorType, &e.DeletedByActorID, &e.DeletedByActorName,
			&e.DeletedAt, &e.IsRestored, &e.RestoredAt, &e.RestoredByActorID, &restoredName,
		); err != nil {
			return nil, 0, err
		}
		if restoredName != "" {
			e.RestoredByActorName = &restoredName
		}
		list = append(list, e)
	}

	return list, total, rows.Err()
}

func (r *RecycleBinRepository) Restore(ctx context.Context, q db.DBExecutor, item *RecycleBinEntity, restoredByActorID int64) error {
	var restoreSQL string
	switch item.EntityTable {
	case "products":
		restoreSQL = `UPDATE products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	case "customers":
		restoreSQL = `UPDATE customers SET deleted_at = NULL, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	case "employees":
		restoreSQL = `UPDATE employees SET deleted_at = NULL, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	case "admins":
		restoreSQL = `UPDATE admins SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	case "roles":
		restoreSQL = `UPDATE roles SET is_active = TRUE WHERE id = $1`
	case "vehicle_brands":
		restoreSQL = `UPDATE vehicle_brands SET is_active = TRUE WHERE id = $1`
	case "vehicle_models":
		restoreSQL = `UPDATE vehicle_models SET is_active = TRUE WHERE id = $1`
	case "categories":
		restoreSQL = `UPDATE categories SET is_active = TRUE WHERE id = $1`
	case "warehouses":
		restoreSQL = `UPDATE warehouses SET is_active = TRUE WHERE id = $1`
	case "warehouse_locations":
		restoreSQL = `UPDATE warehouse_locations SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	case "externals":
		restoreSQL = `UPDATE externals SET is_active = TRUE WHERE id = $1`
	default:
		return fmt.Errorf("la tabla '%s' no soporta restauración automática", item.EntityTable)
	}

	if _, err := q.Exec(ctx, restoreSQL, item.EntityID); err != nil {
		return fmt.Errorf("error al reactivar registro en '%s': %w", item.EntityTable, err)
	}

	const updateRecycleSQL = `
		UPDATE recycle_bin
		SET is_restored = TRUE,
		    restored_at = CURRENT_TIMESTAMP,
		    restored_by_actor_id = $1
		WHERE id = $2
	`
	_, err := q.Exec(ctx, updateRecycleSQL, restoredByActorID, item.ID)
	return err
}

