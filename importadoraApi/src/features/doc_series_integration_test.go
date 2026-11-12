package features_test

// doc_series_integration_test · prueba contra PostgreSQL real que dos bodegas nunca generan el mismo número de documento
// conecta con: core/utils.NextSerialCode y la semilla de doc_series (startdb.pgsql y migración 20261130); todo se revierte al final
// ojo: solo corre si TEST_DATABASE_URL está definida

import (
	"context"
	"testing"

	"importadoraApi/src/core/types"
	"importadoraApi/src/core/utils"
)

// TestSerialsDoNotCollideAcrossWarehouses: pedidos, traslados, cotizaciones, compras y pagos son únicos por compañía
func TestSerialsDoNotCollideAcrossWarehouses(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, docType := range []types.DocSeriesType{types.SeriesSale, types.SeriesPayment} {
		seen := map[string]int64{}
		for _, warehouse := range []int64{1, 2, 3} {
			wh := warehouse
			for i := 0; i < 3; i++ {
				serial, err := utils.NextSerialCode(ctx, tx, 1, &wh, docType, "DOC-")
				if err != nil {
					t.Fatalf("%s bodega %d: %v", docType, wh, err)
				}
				if other, ok := seen[serial]; ok {
					t.Fatalf("%s: el número %s sale en la bodega %d y en la %d", docType, serial, other, wh)
				}
				seen[serial] = wh
			}
		}
	}
}
