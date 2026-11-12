package events

// repository.go · guarda los eventos en realtime_events (un INSERT con varias filas) y avisa con pg_notify('erp_events', seq)
// conecta con: buffer.go (lo llama antes del COMMIT, con la misma transacción) y la migración 20261129_realtime.sql (tabla)
// ojo: pg_notify solo se entrega al hacer COMMIT; si la transacción se revierte, ni la fila ni el aviso existen

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"importadoraApi/src/core/db"
)

// NotifyChannel es el canal de LISTEN que escucha importadoraRealtime.
const NotifyChannel = "erp_events"

const insertChunk = 500 // filas por INSERT (11 parámetros cada una: lejos del límite de 65535)

// storedEvent es un evento listo para guardar (ya con actor y correlationId).
type storedEvent struct {
	Event
	Actor Actor
}

// insertBatch guarda los eventos y devuelve el mayor seq asignado.
func insertBatch(ctx context.Context, q db.DBExecutor, events []storedEvent) (int64, error) {
	var maxSeq int64
	for start := 0; start < len(events); start += insertChunk {
		end := start + insertChunk
		if end > len(events) {
			end = len(events)
		}
		chunk := events[start:end]
		values := make([]string, 0, len(chunk))
		args := make([]any, 0, len(chunk)*11)
		for i, e := range chunk {
			payload, err := json.Marshal(e.Data)
			if err != nil {
				return 0, fmt.Errorf("events: no se pudo serializar %s: %w", e.Type, err)
			}
			warehouses := e.WarehouseIDs
			if warehouses == nil {
				warehouses = []int64{}
			}
			permissions := e.Permissions
			if permissions == nil {
				permissions = []string{}
			}
			b := i * 11
			values = append(values, fmt.Sprintf("($%d, $%d, NULLIF($%d, ''), $%d, $%d, $%d, $%d, $%d, $%d, NULLIF($%d, ''), $%d)",
				b+1, b+2, b+3, b+4, b+5, b+6, b+7, b+8, b+9, b+10, b+11))
			args = append(args, e.CompanyID, warehouses, e.ActorChannel, string(e.Type), permissions,
				e.Actor.Type, e.Actor.ID, e.Actor.Name, e.Platform, e.CorrelationID, payload)
		}
		sql := `INSERT INTO realtime_events (company_id, warehouse_ids, actor_channel, type, permissions, actor_type, actor_id, actor_name, platform, correlation_id, payload)
			VALUES ` + strings.Join(values, ", ") + ` RETURNING seq`
		rows, err := q.Query(ctx, sql, args...)
		if err != nil {
			return 0, fmt.Errorf("events: no se pudieron guardar los eventos: %w", err)
		}
		for rows.Next() {
			var seq int64
			if err := rows.Scan(&seq); err != nil {
				rows.Close()
				return 0, err
			}
			if seq > maxSeq {
				maxSeq = seq
			}
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return 0, err
		}
	}
	return maxSeq, nil
}

// notify avisa al servicio realtime que hay eventos nuevos hasta seq (se entrega al COMMIT).
func notify(ctx context.Context, q db.DBExecutor, seq int64) error {
	// ojo: el payload de pg_notify es texto; se pasa ya convertido (pgx no codifica int64 como text)
	_, err := q.Exec(ctx, "SELECT pg_notify($1, $2)", NotifyChannel, strconv.FormatInt(seq, 10))
	return err
}
