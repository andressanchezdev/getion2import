// CashClosePanel · panel lateral del cierre de caja: el cajero declara el monto en efectivo, el de transferencias y (si hubo) el de abonos; cada uno muestra lo esperado y su diferencia en vivo, y debajo van los gastos de caja y las notas
// conecta con: useCashClose (estado, cálculo y guardado), MoneyInput, global format y DrawerFormShell.css (armazón); lo abre formRegistry («cashClose»)
// ojo: efectivo esperado = fondo + ventas y abonos en efectivo - gastos en efectivo; diferencia = declarado - esperado (verde cuadra, rojo falta, azul sobra); cancelar deja el turno abierto
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './CashClosePanel.css'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { formatCOP, formatDateTime } from '@/global/helpers/formatting/format'
import { BALANCE_LABEL, toneOf } from '../../helpers/cash.helpers'
import { useCashClose } from '../../hooks/useCashClose'
import plusIcon from '@/assets/icons/plus.svg?raw'
import { Icon } from '@/global/components/UI/atoms/Icon'

// tarjeta de un monto del cierre: título, campo de entrada y, debajo, lo esperado con su diferencia
interface AmountCardProps {
  id: string
  title: string
  value: string
  onChange: (digits: string) => void
  expectedLabel: string
  expected: number
  difference: number
  filled: boolean
  required: boolean
  disabled: boolean
}

const AmountCard: React.FC<AmountCardProps> = ({ id, title, value, onChange, expectedLabel, expected, difference, filled, required, disabled }) => (
  <section className="cash-close-card">
    <label className="cash-close-card-title" htmlFor={id}>{title}</label>
    <MoneyInput id={id} className="drawer-form-control" value={value} onValueChange={onChange} placeholder="Ej: 350.000" disabled={disabled} required={required} />
    <div className="cash-close-card-foot">
      <span>{expectedLabel} <strong>{formatCOP(expected)}</strong></span>
      {filled && (
        <span className={`cash-close-chip is-${toneOf(difference)}`} role="status">
          {BALANCE_LABEL[toneOf(difference)]}{difference === 0 ? '' : ` · ${difference > 0 ? '+' : '−'} ${formatCOP(Math.abs(difference))}`}
        </span>
      )}
    </div>
  </section>
)

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

        <section className="cash-close-context">
          <div>
            <span className="cash-close-context-label">Bodega</span>
            <strong>{session.warehouseName}</strong>
            <small>Abrió {session.openedByName} · {formatDateTime(session.openedAt)}</small>
          </div>
          <div className="cash-close-context-fund">
            <span className="cash-close-context-label">Fondo inicial</span>
            <strong>{formatCOP(session.openingAmount)}</strong>
            <small>{session.paymentsCount} {session.paymentsCount === 1 ? 'transacción' : 'transacciones'}</small>
          </div>
        </section>

        <AmountCard
          id="cash-counted"
          title="Monto efectivo"
          value={form.counted}
          onChange={form.setCounted}
          expectedLabel="Esperado en gaveta"
          expected={closing.expectedCash}
          difference={closing.difference}
          filled={form.counted !== ''}
          required
          disabled={form.saving}
        />
        <p className="cash-close-breakdown">
          Ventas en efectivo {formatCOP(session.cashTotal)} · gastos en efectivo − {formatCOP(closing.expensesCash)}
        </p>

        <AmountCard
          id="cash-counted-transfer"
          title="Monto transferencias"
          value={form.countedTransfer}
          onChange={form.setCountedTransfer}
          expectedLabel="Recibido por transferencia"
          expected={session.transferTotal}
          difference={closing.transferDifference}
          filled={form.countedTransfer !== ''}
          required={form.needsTransfer}
          disabled={form.saving}
        />

        {form.needsAbonos && (
          <AmountCard
            id="cash-counted-abonos"
            title="Monto recibido de los abonos"
            value={form.countedAbonos}
            onChange={form.setCountedAbonos}
            expectedLabel="Abonos registrados"
            expected={session.abonosTotal}
            difference={closing.abonosDifference}
            filled={form.countedAbonos !== ''}
            required
            disabled={form.saving}
          />
        )}

        <section className="drawer-form-section">
          <div className="cash-close-expenses-head">
            <h4 className="drawer-form-label">Gastos menores de caja</h4>
            <button type="button" className="btn-secondary" onClick={form.addExpense} disabled={form.saving}><Icon svg={plusIcon} /> Agregar gasto de caja</button>
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
