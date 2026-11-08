// PurchasePayPanel · pago de una recepción de compra desde la caja: resumen de la orden (total, pagado y pendiente), monto en efectivo y número del recibo del proveedor
// conecta con: usePurchasePay (orden, validación y envío), MoneyInput, global format y DrawerFormShell.css (armazón); lo abre formRegistry («purchasePay»)
// ojo: solo se paga una recepción completa, desde el turno de caja abierto de la bodega que la recibió; el gasto aparece en Facturas cuando la caja cierra
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './PurchasePanels.css'
import { MoneyInput } from '@/global/components/UI/molecules/form'
import { formatCOP } from '@/global/helpers/formatting/format'
import { usePurchasePay } from '../../hooks/usePurchasePay'
import type { PurchasePanelPayload } from './PurchaseDetailPanel'

export const PurchasePayPanel: React.FC<{ payload: PurchasePanelPayload & { onDone?: () => void } }> = ({ payload }) => {
  const form = usePurchasePay(payload.id, payload.onDone)
  const { purchase } = form

  if (!purchase) {
    return (
      <div className="drawer-form">
        <div className="drawer-form-body">
          <div className={form.failed ? 'form-field-error-msg' : 'drawer-form-note'}>{form.failed ? form.loadError : 'Cargando la orden…'}</div>
        </div>
      </div>
    )
  }

  return (
    <form className="drawer-form" onSubmit={form.submit}>
      <div className="drawer-form-body">
        <p className="drawer-form-note">
          Orden <strong>{purchase.serial}</strong> · {purchase.supplierName}. Se paga desde la caja de <strong>{purchase.warehouseName || 'la bodega de la orden'}</strong> y queda como gasto del turno abierto.
        </p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}

        <dl className="purchase-facts">
          <div><dt>Total de la orden</dt><dd>{formatCOP(purchase.total)}</dd></div>
          <div><dt>Ya pagado</dt><dd>{formatCOP(purchase.paidTotal)}</dd></div>
          <div><dt>Pendiente</dt><dd><strong>{formatCOP(form.pending)}</strong></dd></div>
        </dl>

        <section className="drawer-form-section">
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="purchase-pay-amount">Monto efectivo *</label>
            <MoneyInput id="purchase-pay-amount" className="drawer-form-control" value={form.amount} onValueChange={form.setAmount} max={form.pending} placeholder="Ej: 350.000" disabled={form.saving} required />
          </div>
          <div className="drawer-form-field">
            <label className="drawer-form-label" htmlFor="purchase-pay-receipt">Número del recibo o factura del proveedor</label>
            <input id="purchase-pay-receipt" className="drawer-form-control" value={form.receipt} maxLength={60} onChange={(e) => form.setReceipt(e.target.value)} placeholder={purchase.supplierRef || 'Ej: FAC-1001'} disabled={form.saving} />
          </div>
        </section>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={Boolean(form.problem) || form.saving}>
          {form.saving ? 'Registrando…' : 'Pagar desde la caja'}
        </button>
      </div>
    </form>
  )
}

export default PurchasePayPanel
