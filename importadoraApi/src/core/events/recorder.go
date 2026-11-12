package events

// recorder.go · punto de entrada de los servicios: Record(ctx, evento) y Stock(ctx, stockID, causa), siempre dentro de db.WithTx
// conecta con: buffer.go (acumula), core/db (TxLocal y OnBeforeCommitOnce: el guardado corre antes del COMMIT) y core/config (interruptor)
// ojo: fuera de una transacción el evento no se puede guardar: en desarrollo es un panic (error de programación), en producción un log.
// Si el guardado falla, WithTx revierte la operación de negocio (decisión 9: nunca un cambio sin su evento)

import (
	"context"
	"fmt"
	"log/slog"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

type bufferKey struct{}

// Recorder guarda los eventos del websocket de cada transacción.
type Recorder struct {
	names   *nameCache
	enabled bool // REALTIME_EVENTS_ENABLED
	strict  bool // APP_ENV=development: un mal uso es panic
}

// NewRecorder crea el recorder. enabled=false no guarda nada (interruptor para desplegar de a poco o volver atrás).
func NewRecorder(enabled, strict bool) *Recorder {
	return &Recorder{names: newNameCache(), enabled: enabled, strict: strict}
}

// Actor devuelve quién hizo la operación actual (tipo, id y nombre), o SystemActor si no hay actor en el contexto.
func (r *Recorder) Actor(ctx context.Context, q db.DBExecutor) Actor {
	if r == nil || r.names == nil {
		return SystemActor
	}
	return r.names.actorFromContext(ctx, q)
}

// Record agrega un evento al buffer de la transacción del contexto.
func (r *Recorder) Record(ctx context.Context, e Event) {
	if r == nil || !r.enabled {
		return
	}
	if err := validate(e); err != nil {
		r.fail(err)
		return
	}
	b, err := r.buffer(ctx)
	if err != nil {
		r.fail(fmt.Errorf("events: %s fuera de db.WithTx: %w", e.Type, err))
		return
	}
	b.events = append(b.events, e)
}

// Stock anota que la fila de stock cambió y por qué; al guardar se relee con su valor final y se agrupa (buffer.go).
func (r *Recorder) Stock(ctx context.Context, stockID int64, cause StockCause) {
	if r == nil || !r.enabled {
		return
	}
	if cause.Type == "" {
		r.fail(fmt.Errorf("events: stock %d sin causa", stockID))
		return
	}
	b, err := r.buffer(ctx)
	if err != nil {
		r.fail(fmt.Errorf("events: stock fuera de db.WithTx: %w", err))
		return
	}
	b.addStock(stockID, cause)
}

// buffer devuelve el buffer de la transacción y registra su guardado la primera vez.
func (r *Recorder) buffer(ctx context.Context) (*buffer, error) {
	v, err := db.TxLocal(ctx, bufferKey{}, func() any { return newBuffer() })
	if err != nil {
		return nil, err
	}
	b := v.(*buffer)
	err = db.OnBeforeCommitOnce(ctx, bufferKey{}, func(ctx context.Context, tx pgx.Tx) error {
		return b.flush(ctx, tx, r.names)
	})
	return b, err
}

func (r *Recorder) fail(err error) {
	if r.strict {
		panic(err)
	}
	slog.Error("evento de tiempo real descartado", "error", err)
}

// validate revisa que el evento tenga lo que su canal necesita (lo arma un constructor, así que esto es una red de seguridad).
func validate(e Event) error {
	r, ok := routes[e.Type]
	switch {
	case !ok:
		return fmt.Errorf("events: tipo desconocido %q", e.Type)
	case r.System:
		return fmt.Errorf("events: %s lo genera importadoraRealtime, no la API", e.Type)
	case e.Data == nil:
		return fmt.Errorf("events: %s sin cuerpo", e.Type)
	case e.ActorChannel == "" && len(e.WarehouseIDs) == 0 && e.CompanyID == nil && !e.Platform:
		return fmt.Errorf("events: %s no va a ningún canal", e.Type)
	case r.Actor && e.ActorChannel == "":
		return fmt.Errorf("events: %s es personal y no tiene destinatario", e.Type)
	case r.Warehouses && len(e.WarehouseIDs) == 0:
		return fmt.Errorf("events: %s va por bodega y no tiene bodegas", e.Type)
	}
	return nil
}
