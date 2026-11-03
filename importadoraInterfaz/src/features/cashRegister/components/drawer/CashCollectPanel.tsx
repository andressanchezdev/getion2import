// CashCollectPanel · panel lateral para cobrar un pedido con pagos mezclados: efectivo, transferencia (con referencia y foto) y crédito
// conecta con: useCashCollect (líneas, validación y envío), cash.collect (nombres de método), MoneyInput, CashClosedBanner y DrawerFormShell.css; lo abre formRegistry («cashCollect»)
// ojo: el efectivo exige turno abierto; la transferencia queda en revisión hasta conciliarla con el banco; el crédito es lo que el cliente deja a deber (se valida contra su cupo); al cubrirse todo el pedido pasa a «verificación confirmada»
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './CashCollectPanel.css'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { formatCOP } from '@/global/helpers/formatting/format'
import { COLLECT_METHOD_LABELS } from '../../helpers/cash.collect'
import { useCashCollect, type CashCollectPayload } from '../../hooks/useCashCollect'
import type { CollectLineMethod } from '../../types/cash.types'
import { CashClosedBanner } from '../shift/CashClosedBanner'

export const CashCollectPanel: React.FC<{ payload: CashCollectPayload }> = ({ payload }) => {
  const form = useCashCollect(payload.order)
  const { order } = form

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <section className="drawer-form-section">
          <dl className="cash-collect-totals">
            <div><dt>Pedido</dt><dd>{order.serial} · {order.customerName}</dd></div>
            <div><dt>Total</dt><dd>{formatCOP(order.totalAmount)}</dd></div>
            <div><dt>Ya verificado</dt><dd>{formatCOP(order.paidAmount)}</dd></div>
            {order.creditAmount > 0 && <div><dt>A crédito</dt><dd>{formatCOP(order.creditAmount)}</dd></div>}
            <div><dt>Falta por cubrir</dt><dd><strong>{formatCOP(form.remaining)}</strong></dd></div>
          </dl>
        </section>

        {!form.shiftOpen && <CashClosedBanner warehouseName="" />}

        {form.lines.map((line, index) => (
          <section key={index} className="drawer-form-section cash-collect-line">
            <div className="drawer-form-grid">
              <div className="drawer-form-field">
                <label className="drawer-form-label" htmlFor={`collect-method-${index}`}>Método del pago {index + 1}</label>
                <select id={`collect-method-${index}`} className="drawer-form-control" value={line.method} onChange={(e) => form.changeLine(index, { method: e.target.value as CollectLineMethod })} disabled={form.saving}>
                  {(Object.keys(COLLECT_METHOD_LABELS) as CollectLineMethod[]).map((method) => (
                    <option key={method} value={method}>{COLLECT_METHOD_LABELS[method]}</option>
                  ))}
                </select>
              </div>
              <div className="drawer-form-field">
                <label className="drawer-form-label" htmlFor={`collect-amount-${index}`}>Monto</label>
                <MoneyInput id={`collect-amount-${index}`} className="drawer-form-control" value={line.amount || ''} max={form.remaining} onValueChange={(digits) => form.changeLine(index, { amount: Number(digits) || 0 })} disabled={form.saving} />
              </div>
            </div>

            {line.method === 'transfer' && (
              <>
                <div className="drawer-form-grid">
                  <div className="drawer-form-field">
                    <label className="drawer-form-label" htmlFor={`collect-reference-${index}`}>Referencia del comprobante *</label>
                    <input id={`collect-reference-${index}`} className="drawer-form-control" value={line.reference} onChange={(e) => form.changeLine(index, { reference: e.target.value })} placeholder="Ej: TRX-888" disabled={form.saving} />
                  </div>
                  <div className="drawer-form-field">
                    <label className="drawer-form-label" htmlFor={`collect-bank-${index}`}>Banco</label>
                    <input id={`collect-bank-${index}`} className="drawer-form-control" value={line.bank} onChange={(e) => form.changeLine(index, { bank: e.target.value })} placeholder="Ej: Bancolombia" disabled={form.saving} />
                  </div>
                </div>
                <div className="drawer-form-field">
                  <label className="drawer-form-label" htmlFor={`collect-proof-${index}`}>Foto del comprobante *</label>
                  <input id={`collect-proof-${index}`} className="drawer-form-control" type="file" accept="image/*" onChange={(e) => form.attachProof(index, e.target.files?.[0])} disabled={form.saving} />
                  {line.fileName && <span className="drawer-form-hint">Archivo: {line.fileName}</span>}
                </div>
                <span className="drawer-form-hint">Queda en revisión: baja la deuda cuando cartera lo concilie con el banco.</span>
              </>
            )}
            {line.method === 'credit' && <span className="drawer-form-hint">Es lo que el cliente deja a deber; se valida contra su cupo disponible.</span>}

            <div className="cash-collect-line-foot">
              {form.lineProblems[index] && <span className="cash-collect-problem" role="status">{form.lineProblems[index]}</span>}
              {form.lines.length > 1 && (
                <button type="button" className="btn-secondary" onClick={() => form.removeLine(index)} disabled={form.saving} aria-label={`Quitar el pago ${index + 1}`}>Quitar</button>
              )}
            </div>
          </section>
        ))}

        <button type="button" className="btn-secondary cash-collect-add" onClick={form.addLine} disabled={form.saving || form.left <= 0}>+ Agregar otro pago</button>

        <section className="drawer-form-section">
          <dl className="cash-collect-totals">
            <div><dt>Este cobro</dt><dd>{formatCOP(form.covered)}</dd></div>
            <div><dt>Quedaría por cubrir</dt><dd>{formatCOP(form.left)}</dd></div>
          </dl>
        </section>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={Boolean(form.problem) || form.saving} title={form.problem ?? undefined}>
          {form.saving ? 'Cobrando…' : 'Registrar cobro'}
        </button>
      </div>
    </form>
  )
}

export default CashCollectPanel
