// Package events guarda los eventos del websocket (outbox) en la misma transacción del cambio de negocio.
//
// Regla de oro: Record y Stock se llaman DENTRO de db.WithTx, nunca después del commit. WithTx corre el guardado
// (INSERT en realtime_events + pg_notify) justo antes del COMMIT; si falla, se revierte todo.
//
//	err := db.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
//		// … cambios de negocio con tx …
//		s.events.Stock(ctx, stockID, events.CauseTransferOut(transferID, serial))
//		s.events.Record(ctx, events.NewTransferStatus(companyID, data))
//		return nil
//	})
//
// El servicio importadoraRealtime lee realtime_events y reparte; no importa este paquete. El contrato de los cuerpos
// está en importadoraRealtime/contract y contract_test.go lo valida contra los structs de types.go.
// Plan: importadoraRealtime/PLAN-WEBSOCKET.md (secciones 7 y 15, etapa E2).
package events
