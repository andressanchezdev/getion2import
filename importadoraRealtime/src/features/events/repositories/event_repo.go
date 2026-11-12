package repositories

// event_repo.go · lectura ordenada de realtime_events sin huecos por commits fuera de orden (tx_id < pg_snapshot_xmin) y purga por antigüedad
// conecta con: features/events/services/{listener_service.go,purge_service.go} y features/connection/services/replay_service.go
// ojo: mientras una transacción con seq menor siga abierta, pg_snapshot_xmin la retiene; cuando confirma, salen todas en orden de seq

import (
	"context"
	"time"

	"importadoraRealtime/src/core/protocol"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const selectColumns = `
	SELECT seq, id::text, type, company_id, warehouse_ids, actor_channel, platform, permissions,
	       actor_type, actor_id, actor_name, correlation_id, payload, created_at
	FROM realtime_events`

// ReplayScope acota la consulta de recuperación al alcance de la conexión.
type ReplayScope struct {
	CompanyID    *int64
	ActorKey     string // "employee:3", "admin:1", "superadmin:1"
	IsSuperadmin bool
}

// EventRepository lee y purga la tabla realtime_events.
type EventRepository struct {
	pool *pgxpool.Pool
}

// NewEventRepository crea el repositorio sobre el pool compartido.
func NewEventRepository(pool *pgxpool.Pool) *EventRepository {
	return &EventRepository{pool: pool}
}

// ReadVisibleAfter lee hasta limit eventos con seq > afterSeq cuyas transacciones anteriores ya terminaron todas (14.7).
func (r *EventRepository) ReadVisibleAfter(ctx context.Context, afterSeq int64, limit int) ([]protocol.StoredEvent, error) {
	rows, err := r.pool.Query(ctx, selectColumns+`
		WHERE seq > $1
		  AND tx_id < pg_snapshot_xmin(pg_current_snapshot())
		ORDER BY seq ASC
		LIMIT $2`, afterSeq, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanEvents(rows)
}

// ReadAfterForScope lee hasta limit eventos en (afterSeq, upToSeq] que pertenecen al alcance del cliente (compañía/plataforma o canal personal).
func (r *EventRepository) ReadAfterForScope(ctx context.Context, afterSeq, upToSeq int64, scope ReplayScope, limit int) ([]protocol.StoredEvent, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if scope.IsSuperadmin {
		rows, err = r.pool.Query(ctx, selectColumns+`
			WHERE seq > $1 AND seq <= $2
			  AND (platform = TRUE OR actor_channel = $3)
			  AND tx_id < pg_snapshot_xmin(pg_current_snapshot())
			ORDER BY seq ASC
			LIMIT $4`, afterSeq, upToSeq, scope.ActorKey, limit)
	} else {
		var companyID int64
		if scope.CompanyID != nil {
			companyID = *scope.CompanyID
		}
		rows, err = r.pool.Query(ctx, selectColumns+`
			WHERE seq > $1 AND seq <= $2
			  AND (company_id = $3 OR actor_channel = $4)
			  AND tx_id < pg_snapshot_xmin(pg_current_snapshot())
			ORDER BY seq ASC
			LIMIT $5`, afterSeq, upToSeq, companyID, scope.ActorKey, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanEvents(rows)
}

// CurrentVisibleSeq devuelve el mayor seq ya visible (0 si la tabla está vacía).
func (r *EventRepository) CurrentVisibleSeq(ctx context.Context) (int64, error) {
	var seq int64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(MAX(seq), 0)
		FROM realtime_events
		WHERE tx_id < pg_snapshot_xmin(pg_current_snapshot())`).Scan(&seq)
	return seq, err
}

// OldestSeq devuelve el menor seq aún presente en la tabla (0 si está vacía).
func (r *EventRepository) OldestSeq(ctx context.Context) (int64, error) {
	var seq int64
	err := r.pool.QueryRow(ctx, `SELECT COALESCE(MIN(seq), 0) FROM realtime_events`).Scan(&seq)
	return seq, err
}

// PurgeOlderThan borra las filas con más antigüedad que age y devuelve cuántas eliminó.
func (r *EventRepository) PurgeOlderThan(ctx context.Context, age time.Duration) (int64, error) {
	secs := int64(age.Seconds())
	if secs < 1 {
		secs = 1
	}
	tag, err := r.pool.Exec(ctx, `DELETE FROM realtime_events WHERE created_at < now() - ($1::bigint * interval '1 second')`, secs)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func scanEvents(rows pgx.Rows) ([]protocol.StoredEvent, error) {
	var out []protocol.StoredEvent
	for rows.Next() {
		var e protocol.StoredEvent
		if err := rows.Scan(
			&e.Seq, &e.ID, &e.Type, &e.CompanyID, &e.WarehouseIDs, &e.ActorChannel,
			&e.Platform, &e.Permissions, &e.Actor.Type, &e.Actor.ID, &e.Actor.Name,
			&e.CorrelationID, &e.Payload, &e.OccurredAt,
		); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// PurgeExpiredTickets borra los tickets vencidos hace más de una hora (usados o no); el usuario importadora_realtime tiene DELETE.
func (r *EventRepository) PurgeExpiredTickets(ctx context.Context) (int64, error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM realtime_tickets WHERE expires_at < now() - interval '1 hour'`)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
