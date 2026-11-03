// BankConfirmPanel · panel lateral para confirmar un movimiento del banco: elige el pago por transferencia que respalda (o ninguno) y confirma; al ligar un pago, la API lo verifica
// conecta con: usePendingPayments (pagos en revisión), bank.adapter (candidatos), useBankActions (confirmar), DrawerFormShell.css (armazón) y navigation (cerrar); lo abre formRegistry («bankConfirm»)
// ojo: los pagos salen ordenados con el más probable arriba (misma referencia o mismo valor); un pago de otro valor se puede elegir pero se marca
import React, { useState } from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './BankConfirmPanel.css'
import { closeDrawerForm } from '@/features/navigation'
import { formatPesos } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { candidatePayments, isExactMatch } from '../../helpers/bank.adapter'
import { useBankActions } from '../../hooks/useBankActions'
import { usePendingPayments } from '../../hooks/usePendingPayments'
import type { BankRecord } from '../../types/bank.types'

export const BankConfirmPanel: React.FC<{ record: BankRecord }> = ({ record }) => {
  const dispatch = useAppDispatch()
  const pending = usePendingPayments()
  const actions = useBankActions()
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const candidates = candidatePayments(record, pending.items)

  // confirma el movimiento (con el pago elegido, si hay) y cierra el panel si salió bien
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (await actions.confirm(record.id, paymentId ?? undefined, notes)) dispatch(closeDrawerForm())
  }

  return (
    <form className="drawer-form" onSubmit={submit}>
      <div className="drawer-form-body">
        <div className="bank-confirm-record">
          <strong className="bank-confirm-amount table-amount">{formatPesos(record.amount)}</strong>
          <span>{record.description}</span>
          <small>
            {record.date} · {record.channel || 'sin canal'}
            {record.reference ? ` · ref. ${record.reference}` : ''}
          </small>
        </div>

        <section className="drawer-form-section">
          <h4 className="drawer-form-section-title">Pago que respalda esta entrada</h4>
          {pending.status === 'failed' && <div className="form-field-error-msg">{pending.error}</div>}
          {pending.status !== 'failed' && candidates.length === 0 && <p className="drawer-form-note">{pending.status === 'succeeded' ? 'No hay pagos por transferencia esperando verificación.' : 'Buscando pagos por verificar…'}</p>}
          <ul className="bank-confirm-list">
            {candidates.map((payment) => (
              <li key={payment.id}>
                <label className={`bank-confirm-option ${paymentId === payment.id ? 'bank-confirm-option-on' : ''}`}>
                  <input type="radio" name="payment" checked={paymentId === payment.id} onChange={() => setPaymentId(payment.id)} />
                  <span className="bank-confirm-option-text">
                    <strong>
                      {payment.serial} · {payment.saleSerial}
                    </strong>
                    <span>{payment.customerName}</span>
                    <small>{payment.reference ? `ref. ${payment.reference}` : 'sin referencia'}</small>
                  </span>
                  <span className="bank-confirm-option-amount table-amount">
                    {formatPesos(payment.amount)}
                    {isExactMatch(record, payment) ? <em>mismo valor</em> : <em className="bank-confirm-diff">otro valor</em>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {paymentId !== null && (
            <button type="button" className="drawer-form-add" onClick={() => setPaymentId(null)}>
              Quitar el pago elegido
            </button>
          )}
          <span className="drawer-form-hint">Al ligar un pago, queda verificado. Sin pago, solo se confirma que la entrada llegó al banco.</span>
        </section>

        <div className="drawer-form-field">
          <label className="drawer-form-label" htmlFor="bank-notes">Observación (opcional)</label>
          <textarea id="bank-notes" className="drawer-form-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={actions.saving} />
        </div>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={actions.saving} onClick={() => dispatch(closeDrawerForm())}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={actions.saving}>
          {actions.saving ? 'Confirmando…' : paymentId ? 'Confirmar y verificar pago' : 'Confirmar entrada'}
        </button>
      </div>
    </form>
  )
}

export default BankConfirmPanel
