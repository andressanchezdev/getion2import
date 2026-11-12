package events

// credit.go · arma credit.balance_changed con el resumen de crédito ya guardado (cupo, usado, disponible, saldo a favor y estado)
// conecta con: recorder.go (Record) y la vista v_customer_credit_summary; lo llaman pagos, cartera, ventas y devoluciones
// ojo: se lee con la misma transacción, después de asentar el movimiento, para que el evento lleve los valores finales y el front no tenga que pedirlos

import (
	"context"
	"fmt"
	"math"
	"time"

	"importadoraApi/src/core/db"
)

// creditWarningPct es el porcentaje de cupo usado desde el que el estado pasa a «warning» (el mismo umbral que muestra cartera)
const creditWarningPct = 70.0

// CreditStatusOf deduce el estado del crédito: sin crédito o sin cupo disponible es «blocked»; con el 70 % o más usado, «warning».
func CreditStatusOf(enabled bool, limit, available float64) string {
	if !enabled || limit <= 0 || available <= 0 {
		return "blocked"
	}
	if (limit-available)/limit*100 >= creditWarningPct {
		return "warning"
	}
	return "ok"
}

// CreditBalance lee el resumen de crédito del cliente y graba credit.balance_changed con el movimiento que lo causó.
func (r *Recorder) CreditBalance(ctx context.Context, q db.DBExecutor, companyID, customerID int64, entry *CreditEntryRef) {
	if r == nil || !r.enabled {
		return
	}
	var enabled bool
	var limit, balance, available float64
	err := q.QueryRow(ctx, `SELECT credit_enabled, credit_limit, credit_balance, available_credit FROM v_customer_credit_summary WHERE customer_id = $1`, customerID).
		Scan(&enabled, &limit, &balance, &available)
	if err != nil {
		r.fail(fmt.Errorf("events: no se pudo leer el crédito del cliente %d: %w", customerID, err))
		return
	}
	r.Record(ctx, NewCreditBalanceChanged(companyID, CreditBalanceChangedData{
		CustomerID:   customerID,
		CreditLimit:  limit,
		Used:         math.Max(limit-available, 0),
		Available:    math.Max(available, 0),
		FavorBalance: math.Max(balance, 0),
		Status:       CreditStatusOf(enabled, limit, available),
		Entry:        entry,
		Version:      time.Now().UTC(),
	}))
}
