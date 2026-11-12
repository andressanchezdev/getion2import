package events

// cash.go · arma cash_session.totals_changed con los totales vivos del turno de caja, leídos en la misma transacción
// conecta con: recorder.go (Record) y las tablas cash_sessions, payments, sales y cash_session_expenses; lo llaman pagos y compras
// ojo: las sumas son las mismas de CashSessionRepository.SessionTotals y RegisteredExpensesCash (si cambia una regla allá, cambia aquí);
// un turno ya cerrado no avisa totales: su cierre viaja en cash_session.status_changed

import (
	"context"
	"errors"
	"fmt"
	"time"

	"importadoraApi/src/core/db"

	"github.com/jackc/pgx/v5"
)

const cashTotalsSQL = `
	SELECT cs.company_id, cs.warehouse_id, cs.status, cs.opening_amount,
		COALESCE(SUM(p.amount) FILTER (WHERE s.payment_method <> 'credit' AND p.method = 'cash' AND p.status = 'verified'), 0),
		COALESCE(SUM(p.amount) FILTER (WHERE s.payment_method <> 'credit' AND p.method = 'transfer' AND p.status <> 'voided'), 0),
		COALESCE(SUM(p.amount) FILTER (WHERE s.payment_method = 'credit' AND p.status <> 'voided'), 0),
		COALESCE(SUM(p.amount) FILTER (WHERE s.payment_method = 'credit' AND p.method = 'cash' AND p.status = 'verified'), 0),
		COUNT(p.id) FILTER (WHERE p.status <> 'voided'),
		(SELECT COALESCE(SUM(e.cash_amount), 0) FROM cash_session_expenses e WHERE e.cash_session_id = cs.id)
	FROM cash_sessions cs
	LEFT JOIN payments p ON p.cash_session_id = cs.id
	LEFT JOIN sales s ON s.id = p.sale_id
	WHERE cs.id = $1
	GROUP BY cs.id`

// CashSessionTotals lee los totales del turno y graba cash_session.totals_changed (solo si el turno sigue abierto).
func (r *Recorder) CashSessionTotals(ctx context.Context, q db.DBExecutor, sessionID int64) {
	if r == nil || !r.enabled || sessionID <= 0 {
		return
	}
	var companyID, warehouseID int64
	var status string
	var opening, cash, transfer, abonos, abonosCash, expenses float64
	var count int
	err := q.QueryRow(ctx, cashTotalsSQL, sessionID).Scan(&companyID, &warehouseID, &status, &opening, &cash, &transfer, &abonos, &abonosCash, &count, &expenses)
	if errors.Is(err, pgx.ErrNoRows) {
		return
	}
	if err != nil {
		r.fail(fmt.Errorf("events: no se pudieron leer los totales del turno %d: %w", sessionID, err))
		return
	}
	if status != "open" {
		return
	}
	r.Record(ctx, NewCashSessionTotalsChanged(companyID, warehouseID, CashSessionTotalsChangedData{
		SessionID:     sessionID,
		CashIn:        cash,
		TransferIn:    transfer,
		AbonosIn:      abonos,
		PaymentsCount: count,
		Expenses:      expenses,
		ExpectedCash:  opening + cash + abonosCash - expenses,
		Version:       time.Now().UTC(),
	}))
}

// CashSessionTotalsOfPayment avisa los totales del turno al que quedó ligado un pago (payments.cash_session_id); sin turno no avisa.
func (r *Recorder) CashSessionTotalsOfPayment(ctx context.Context, q db.DBExecutor, paymentID int64) {
	if r == nil || !r.enabled {
		return
	}
	var sessionID *int64
	if err := q.QueryRow(ctx, `SELECT cash_session_id FROM payments WHERE id = $1`, paymentID).Scan(&sessionID); err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			r.fail(fmt.Errorf("events: no se pudo leer el turno del pago %d: %w", paymentID, err))
		}
		return
	}
	if sessionID != nil {
		r.CashSessionTotals(ctx, q, *sessionID)
	}
}
