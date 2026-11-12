package events

// buffer.go · acumula los eventos de UNA transacción y los guarda en un solo paso justo antes del COMMIT
// conecta con: recorder.go (Record/Stock lo llenan), core/db (gancho OnBeforeCommit de WithTx), repository.go (INSERT + pg_notify) y actor.go
// ojo: el stock se agrupa: cada fila tocada sale UNA vez con su valor FINAL (se relee en la misma transacción), agrupada por causa,
// con los totales del producto en esa bodega (todas sus ubicaciones) y en mensajes de máximo 200 filas

import (
	"context"
	"fmt"

	"importadoraApi/src/core/middlewares"

	"github.com/jackc/pgx/v5"
)

// StockBatchSize es el máximo de filas de stock por mensaje stock.changed.
const StockBatchSize = 200

type buffer struct {
	events     []Event
	stockOrder []int64              // orden en que se tocaron las filas
	stockCause map[int64]StockCause // última causa de cada fila
}

func newBuffer() *buffer {
	return &buffer{stockCause: map[int64]StockCause{}}
}

func (b *buffer) addStock(stockID int64, cause StockCause) {
	if _, seen := b.stockCause[stockID]; !seen {
		b.stockOrder = append(b.stockOrder, stockID)
	}
	b.stockCause[stockID] = cause
}

// flush arma los stock.changed, completa actor y correlationId, guarda todo y avisa (corre dentro de la transacción).
func (b *buffer) flush(ctx context.Context, tx pgx.Tx, names *nameCache) error {
	stockEvents, err := b.stockEvents(ctx, tx)
	if err != nil {
		return err
	}
	all := append(append([]Event{}, b.events...), stockEvents...)
	if len(all) == 0 {
		return nil
	}
	actor := names.actorFromContext(ctx, tx)
	correlation := middlewares.RequestIDFrom(ctx)
	stored := make([]storedEvent, len(all))
	for i, e := range all {
		if e.CorrelationID == "" {
			e.CorrelationID = correlation
		}
		stored[i] = storedEvent{Event: e, Actor: actor}
	}
	maxSeq, err := insertBatch(ctx, tx, stored)
	if err != nil {
		return err
	}
	return notify(ctx, tx, maxSeq)
}

type causeKey struct {
	Type    string
	RefType string
	RefID   int64
	Serial  string
}

func keyOf(c StockCause) causeKey {
	k := causeKey{Type: c.Type}
	if c.ReferenceType != nil {
		k.RefType = *c.ReferenceType
	}
	if c.ReferenceID != nil {
		k.RefID = *c.ReferenceID
	}
	if c.ReferenceSerial != nil {
		k.Serial = *c.ReferenceSerial
	}
	return k
}

// stockEvents relee las filas tocadas (valores finales) y arma los stock.changed por causa, en lotes de 200.
func (b *buffer) stockEvents(ctx context.Context, tx pgx.Tx) ([]Event, error) {
	if len(b.stockOrder) == 0 {
		return nil, nil
	}
	type rowWithCompany struct {
		row       StockRow
		companyID int64
	}
	rows, err := tx.Query(ctx, `
		SELECT s.id, s.product_id, p.code, s.warehouse_id, s.location, s.available, s.reserved, s.min_stock, s.updated_at, s.company_id
		FROM stock s JOIN products p ON p.id = s.product_id
		WHERE s.id = ANY($1)`, b.stockOrder)
	if err != nil {
		return nil, fmt.Errorf("events: no se pudo leer el stock tocado: %w", err)
	}
	byID := map[int64]rowWithCompany{}
	for rows.Next() {
		var r rowWithCompany
		if err := rows.Scan(&r.row.StockID, &r.row.ProductID, &r.row.ProductCode, &r.row.WarehouseID, &r.row.Location,
			&r.row.Available, &r.row.Reserved, &r.row.MinStock, &r.row.Version, &r.companyID); err != nil {
			rows.Close()
			return nil, err
		}
		r.row.Sellable = r.row.Available - r.row.Reserved
		r.row.LowStock = r.row.Sellable <= r.row.MinStock
		byID[r.row.StockID] = r
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// agrupa por causa respetando el orden en que se tocaron las filas
	type group struct {
		cause     StockCause
		companyID int64
		rows      []StockRow
	}
	var order []causeKey
	groups := map[causeKey]*group{}
	for _, id := range b.stockOrder {
		r, ok := byID[id]
		if !ok {
			continue // la fila se borró en la misma transacción
		}
		cause := b.stockCause[id]
		k := keyOf(cause)
		g, ok := groups[k]
		if !ok {
			g = &group{cause: cause, companyID: r.companyID}
			groups[k] = g
			order = append(order, k)
		}
		g.rows = append(g.rows, r.row)
	}

	var out []Event
	for _, k := range order {
		g := groups[k]
		for start := 0; start < len(g.rows); start += StockBatchSize {
			end := start + StockBatchSize
			if end > len(g.rows) {
				end = len(g.rows)
			}
			batch := g.rows[start:end]
			totals, err := stockTotals(ctx, tx, batch)
			if err != nil {
				return nil, err
			}
			companyID := g.companyID
			out = append(out, New(StockChanged, InCompany(companyID), StockChangedData{Cause: g.cause, Rows: batch, Totals: totals}))
		}
	}
	return out, nil
}

// stockTotals suma TODAS las ubicaciones de cada producto en cada bodega del lote (incluye filas que no se tocaron).
func stockTotals(ctx context.Context, tx pgx.Tx, batch []StockRow) ([]StockTotal, error) {
	products := make([]int64, 0, len(batch))
	warehouses := make([]int64, 0, len(batch))
	seen := map[[2]int64]bool{}
	for _, r := range batch {
		k := [2]int64{r.ProductID, r.WarehouseID}
		if !seen[k] {
			seen[k] = true
			products = append(products, r.ProductID)
			warehouses = append(warehouses, r.WarehouseID)
		}
	}
	rows, err := tx.Query(ctx, `
		SELECT s.product_id, s.warehouse_id, COALESCE(SUM(s.available), 0)::int, COALESCE(SUM(s.reserved), 0)::int
		FROM stock s
		JOIN unnest($1::bigint[], $2::bigint[]) AS k(product_id, warehouse_id) ON k.product_id = s.product_id AND k.warehouse_id = s.warehouse_id
		GROUP BY s.product_id, s.warehouse_id
		ORDER BY s.warehouse_id, s.product_id`, products, warehouses)
	if err != nil {
		return nil, fmt.Errorf("events: no se pudieron sumar los totales de stock: %w", err)
	}
	defer rows.Close()
	var totals []StockTotal
	for rows.Next() {
		var t StockTotal
		if err := rows.Scan(&t.ProductID, &t.WarehouseID, &t.Available, &t.Reserved); err != nil {
			return nil, err
		}
		t.Sellable = t.Available - t.Reserved
		totals = append(totals, t)
	}
	return totals, rows.Err()
}
