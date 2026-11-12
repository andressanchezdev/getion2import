package events

// buffer_test · el guardado de eventos contra PostgreSQL real: rollback sin eventos, stock agrupado por fila, lotes de 200, totales de
// todas las ubicaciones y aviso pg_notify al confirmar
// conecta con: recorder.go, buffer.go, repository.go y core/db (WithTx)
// ojo: solo corre si TEST_DATABASE_URL está definida (una base creada con startdb.pgsql, nunca la de trabajo); deja el stock como estaba

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"importadoraApi/src/core/db"
	"importadoraApi/src/core/middlewares"
	"importadoraApi/src/core/types"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL no está definida")
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}

// testCtx simula una petición de Juan Felipe Montoya (empleado 3) con su id de petición
func testCtx(t *testing.T) (context.Context, string) {
	company := int64(1)
	id := fmt.Sprintf("test-%s-%d", t.Name(), time.Now().UnixNano())
	ctx := middlewares.WithActor(context.Background(), &middlewares.ActorContext{ActorType: types.ActorEmployee, ActorID: 3, CompanyID: &company})
	return middlewares.WithRequestID(ctx, id), id
}

type savedEvent struct {
	Type      string
	ActorType string
	ActorName string
	Payload   []byte
}

func eventsOf(t *testing.T, pool *pgxpool.Pool, correlation string) []savedEvent {
	t.Helper()
	ctx := context.Background()
	t.Cleanup(func() { _, _ = pool.Exec(ctx, "DELETE FROM realtime_events WHERE correlation_id = $1", correlation) })
	rows, err := pool.Query(ctx, "SELECT type, actor_type, actor_name, payload FROM realtime_events WHERE correlation_id = $1 ORDER BY seq", correlation)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var out []savedEvent
	for rows.Next() {
		var e savedEvent
		if err := rows.Scan(&e.Type, &e.ActorType, &e.ActorName, &e.Payload); err != nil {
			t.Fatal(err)
		}
		out = append(out, e)
	}
	return out
}

func TestRollbackLeavesNoEvent(t *testing.T) {
	pool := testPool(t)
	rec := NewRecorder(true, true)
	ctx, correlation := testCtx(t)
	_ = db.WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		rec.Record(ctx, NewEntityStatus(1, nil, EntityRef{Kind: KindCustomer, ID: 2, Version: time.Now()}, "active", "inactive", nil, map[string]any{"id": 2}))
		rec.Stock(ctx, 1, CauseAdjustment())
		return errors.New("el servicio falla")
	})
	if got := eventsOf(t, pool, correlation); len(got) != 0 {
		t.Fatalf("un rollback no debe dejar eventos: %d", len(got))
	}
}

func TestEventIsSavedWithActorAndCorrelation(t *testing.T) {
	pool := testPool(t)
	rec := NewRecorder(true, true)
	ctx, correlation := testCtx(t)
	err := db.WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		rec.Record(ctx, NewEntityStatus(1, nil, EntityRef{Kind: KindCustomer, ID: 2, Version: time.Now()}, "active", "inactive", nil, map[string]any{"id": 2}))
		return nil
	})
	got := eventsOf(t, pool, correlation)
	if err != nil || len(got) != 1 || got[0].Type != string(EntityStatusChanged) || got[0].ActorType != "employee" || got[0].ActorName != "Juan Felipe Montoya" {
		t.Fatalf("se esperaba 1 evento del empleado 3 con su nombre (error %v): %+v", err, got)
	}
}

func stockValue(t *testing.T, pool *pgxpool.Pool, id int64) int {
	var v int
	if err := pool.QueryRow(context.Background(), "SELECT available FROM stock WHERE id = $1", id).Scan(&v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestStockCoalescesByStockID(t *testing.T) {
	pool := testPool(t)
	rec := NewRecorder(true, true)
	ctx, correlation := testCtx(t)
	before := stockValue(t, pool, 1)
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), "UPDATE stock SET available = $1 WHERE id = 1", before) })

	err := db.WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		for i := 0; i < 3; i++ {
			if _, err := tx.Exec(ctx, "UPDATE stock SET available = available + 1 WHERE id = 1"); err != nil {
				return err
			}
			rec.Stock(ctx, 1, CauseAdjustment())
		}
		return nil
	})
	got := eventsOf(t, pool, correlation)
	if err != nil || len(got) != 1 {
		t.Fatalf("3 cambios de la misma fila → 1 stock.changed (error %v, eventos %d)", err, len(got))
	}
	var data StockChangedData
	_ = json.Unmarshal(got[0].Payload, &data)
	if len(data.Rows) != 1 || data.Rows[0].Available != before+3 || data.Cause.Type != "adjustment" {
		t.Fatalf("una sola fila con el valor final %d: %+v", before+3, data.Rows)
	}
}

func TestStockBatchesOf200(t *testing.T) {
	pool := testPool(t)
	rec := NewRecorder(true, true)
	ctx, correlation := testCtx(t)
	var ids []int64
	rows, err := pool.Query(context.Background(), "SELECT id FROM stock ORDER BY id LIMIT 250")
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var id int64
		_ = rows.Scan(&id)
		ids = append(ids, id)
	}
	rows.Close()
	if len(ids) < 201 {
		t.Skipf("la base de prueba tiene %d filas de stock; se necesitan más de 200", len(ids))
	}

	err = db.WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		for _, id := range ids {
			rec.Stock(ctx, id, CauseCountAdjust(8))
		}
		return nil
	})
	got := eventsOf(t, pool, correlation)
	want := (len(ids) + StockBatchSize - 1) / StockBatchSize
	if err != nil || len(got) != want {
		t.Fatalf("%d filas → %d mensajes de máximo %d (error %v, mensajes %d)", len(ids), want, StockBatchSize, err, len(got))
	}
	total := 0
	for _, e := range got {
		var data StockChangedData
		_ = json.Unmarshal(e.Payload, &data)
		if len(data.Rows) > StockBatchSize {
			t.Fatalf("un mensaje lleva %d filas", len(data.Rows))
		}
		total += len(data.Rows)
	}
	if total != len(ids) {
		t.Fatalf("se perdieron filas: %d de %d", total, len(ids))
	}
}

func TestTotalsIncludeOtherLocations(t *testing.T) {
	pool := testPool(t)
	rec := NewRecorder(true, true)
	ctx, correlation := testCtx(t)
	// un producto con más de una ubicación en la misma bodega (la semilla reparte varios)
	var stockID, productID, warehouseID int64
	var sumAvailable int
	err := pool.QueryRow(context.Background(), `
		SELECT MIN(id), product_id, warehouse_id, SUM(available)::int FROM stock
		GROUP BY product_id, warehouse_id HAVING COUNT(*) > 1 ORDER BY product_id LIMIT 1`).Scan(&stockID, &productID, &warehouseID, &sumAvailable)
	if err != nil {
		t.Skipf("no hay productos con varias ubicaciones en la base de prueba: %v", err)
	}
	err = db.WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		rec.Stock(ctx, stockID, CauseRelocation())
		return nil
	})
	got := eventsOf(t, pool, correlation)
	if err != nil || len(got) != 1 {
		t.Fatalf("se esperaba 1 evento (error %v)", err)
	}
	var data StockChangedData
	_ = json.Unmarshal(got[0].Payload, &data)
	if len(data.Totals) != 1 || data.Totals[0].Available != sumAvailable || len(data.Rows) != 1 {
		t.Fatalf("el total debe sumar todas las ubicaciones (%d), no solo la tocada: %+v", sumAvailable, data.Totals)
	}
}

func TestNotifyArrivesOnCommit(t *testing.T) {
	pool := testPool(t)
	rec := NewRecorder(true, true)
	ctx, correlation := testCtx(t)
	conn, err := pool.Acquire(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	if _, err := conn.Exec(context.Background(), "LISTEN "+NotifyChannel); err != nil {
		t.Fatal(err)
	}
	err = db.WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		rec.Record(ctx, New(PaymentStatusChanged, InCompany(1), PaymentStatusChangedData{Entity: EntityRef{Kind: KindPayment, ID: 1, Version: time.Now()}, From: "review", To: "verified"}))
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	_ = eventsOf(t, pool, correlation)
	waitCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	n, err := conn.Conn().WaitForNotification(waitCtx)
	if err != nil || n.Channel != NotifyChannel || n.Payload == "" {
		t.Fatalf("se esperaba el aviso de %s con el seq: %v %+v", NotifyChannel, err, n)
	}
}

func TestRecordOutsideTxPanicsInDevelopment(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Fatal("en desarrollo, Record fuera de WithTx debe ser un panic")
		}
	}()
	NewRecorder(true, true).Record(context.Background(), New(StockChanged, InCompany(1), StockChangedData{}))
}

func TestDisabledRecorderSavesNothing(t *testing.T) {
	// con REALTIME_EVENTS_ENABLED=false ni siquiera fuera de una transacción falla
	NewRecorder(false, true).Record(context.Background(), New(StockChanged, InCompany(1), StockChangedData{}))
}
