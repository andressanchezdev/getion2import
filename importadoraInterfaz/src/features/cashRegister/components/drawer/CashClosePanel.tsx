// CashClosePanel · panel lateral del arqueo y cierre del turno: ingresos del turno, gastos de caja, efectivo contado y la diferencia en vivo
// conecta con: useCashClose (estado, cálculo y guardado), MoneyInput, Pill, global format y DrawerFormShell.css (armazón); lo abre formRegistry («cashClose»)
// ojo: esperado = fondo + ventas en efectivo - gastos en efectivo; diferencia = contado - esperado (verde cuadra, rojo falta, azul sobra); cancelar deja el turno abierto
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './CashClosePanel.css'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { formatCOP, formatDateTime } from '@/global/helpers/formatting/format'
import { BALANCE_LABEL } from '../../helpers/cash.helpers'
import { useCashClose } from '../../hooks/useCashClose'

export const CashClosePanel: React.FC = () => {
  const form = useCashClose()
  const { session, closing } = form

  if (!session || !closing) {
    return (
      <div className="drawer-form">
        <div className="drawer-form-body">
          <div className="drawer-form-note">No hay un turno abierto para cerrar en esta bodega.</div>
        </div>
        <div className="drawer-form-footer">
          <button type="button" className="btn-secondary" onClick={form.cancel}>Cerrar</button>
        </div>
      </div>
    )
  }

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <section className="drawer-form-section cash-close-context">
          <span>Bodega <strong>{session.warehouseName}</strong></span>
          <span>Abrió <strong>{session.openedByName}</strong> · {formatDateTime(session.openedAt)}</span>
        </section>

        <section className="drawer-form-section">
          <dl className="cash-close-totals">
            <div><dt>Ventas en efectivo</dt><dd>{formatCOP(session.cashTotal)}</dd></div>
            <div><dt>Ventas por transferencia</dt><dd>{formatCOP(session.transferTotal)}</dd></div>
            <div><dt>Transacciones registradas</dt><dd>{session.paymentsCount}</dd></div>
            <div><dt>Fondo inicial</dt><dd>{formatCOP(session.openingAmount)}</dd></div>
          </dl>
        </section>

        <section className="drawer-form-section">
          <div className="cash-close-expenses-head">
            <h4 className="drawer-form-label">Gastos menores de caja</h4>
            <button type="button" className="btn-secondary" onClick={form.addExpense} disabled={form.saving}>+ Agregar gasto de caja</button>
          </div>
          {form.expenses.length === 0 && <span className="drawer-form-hint">Si pagaste algo desde la caja (domicilios, papelería...), decláralo aquí.</span>}
          {form.expenses.map((expense, index) => (
            <div key={index} className="cash-close-expense">
              <input className="drawer-form-control" aria-label={`Nº de factura o recibo del gasto ${index + 1}`} placeholder="Nº factura / recibo" value={expense.receiptNumber} onChange={(e) => form.changeExpense(index, { receiptNumber: e.target.value })} disabled={form.saving} />
              <input className="drawer-form-control" aria-label={`Concepto o proveedor del gasto ${index + 1}`} placeholder="Concepto / proveedor" value={expense.concept} onChange={(e) => form.changeExpense(index, { concept: e.target.value })} disabled={form.saving} />
              <MoneyInput className="drawer-form-control" aria-label={`Monto en efectivo del gasto ${index + 1}`} placeholder="Efectivo" value={expense.cashAmount || ''} onValueChange={(digits) => form.changeExpense(index, { cashAmount: Number(digits) || 0 })} disabled={form.saving} />
              <MoneyInput className="drawer-form-control" aria-label={`Monto por transferencia del gasto ${index + 1}`} placeholder="Transferencia" value={expense.transferAmount || ''} onValueChange={(digits) => form.changeExpense(index, { transferAmount: Number(digits) || 0 })} disabled={form.saving} />
              <button type="button" className="btn-secondary cash-close-remove" aria-label={`Quitar el gasto ${index + 1}`} onClick={() => form.removeExpense(index)} disabled={form.saving}>Quitar</button>
            </div>
          ))}
        </section>

        <section className="drawer-form-section">
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="cash-counted">Efectivo contado en la gaveta *</label>
            <MoneyInput id="cash-counted" className="drawer-form-control" value={form.counted} onValueChange={form.setCounted} placeholder="Ej: 350.000" disabled={form.saving} required />
          </div>
          <dl className="cash-close-totals">
            <div><dt>Gastos en efectivo</dt><dd>− {formatCOP(closing.expensesCash)}</dd></div>
            <div><dt>Efectivo esperado</dt><dd>{formatCOP(closing.expectedCash)}</dd></div>
          </dl>
          {form.hasCounted && (
            <div className={`cash-close-result is-${closing.tone}`} role="status">
              <strong>{BALANCE_LABEL[closing.tone]}</strong>
              <span>{closing.difference === 0 ? formatCOP(0) : `${closing.difference > 0 ? '+' : '−'} ${formatCOP(Math.abs(closing.difference))}`}</span>
            </div>
          )}
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="cash-notes">Notas del cierre</label>
            <textarea id="cash-notes" className="drawer-form-control" rows={2} value={form.notes} onChange={(e) => form.setNotes(e.target.value)} disabled={form.saving} />
          </div>
        </section>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={!form.hasCounted || form.saving}>
          {form.saving ? 'Cerrando…' : 'Confirmar cierre de caja'}
        </button>
      </div>
    </form>
  )
}

export default CashClosePanel
