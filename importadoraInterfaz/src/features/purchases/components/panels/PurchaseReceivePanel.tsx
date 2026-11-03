// PurchaseReceivePanel · recepción en bodega: por cada producto pendiente, cuánto llega y en qué ubicación de la bodega queda
// conecta con: usePurchaseReceive (renglones, validación y envío), purchases.rules (pendiente), DrawerFormShell.css (armazón); lo abre formRegistry («purchaseReceive»)
// ojo: la ubicación es obligatoria y solo se ofrecen las activas de la bodega de la orden (si no hay, se avisa que se creen en Inventario › Ubicaciones); la cantidad no pasa de lo pendiente
import React from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './PurchasePanels.css'
import { pendingOf } from '../../helpers/purchases.rules'
import { usePurchaseReceive } from '../../hooks/usePurchaseReceive'
import type { PurchasePanelPayload } from './PurchaseDetailPanel'

export const PurchaseReceivePanel: React.FC<{ payload: PurchasePanelPayload & { onDone?: () => void } }> = ({ payload }) => {
  const form = usePurchaseReceive(payload.id, payload.onDone)
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
          Orden <strong>{purchase.serial}</strong> · {purchase.supplierName}. La mercancía entra a <strong>{purchase.warehouseName || 'la bodega de la orden'}</strong>.
        </p>
        {form.error && <div className="form-field-error-msg">{form.error}</div>}
        {form.locations.length === 0 && <div className="form-field-error-msg">Esta bodega no tiene ubicaciones activas: créalas en Inventario › Ubicaciones antes de recibir.</div>}

        {purchase.items.filter((item) => pendingOf(item) > 0).length === 0 && <div className="drawer-form-note">No queda nada por recibir en esta orden.</div>}

        {form.lines.map((line) => {
          const item = purchase.items.find((candidate) => candidate.id === line.purchaseItemId)
          if (!item) return null
          return (
            <section key={item.id} className="drawer-form-section">
              <div className="purchase-receive-head">
                <strong>{item.productCode}</strong>
                <span>{item.productName}</span>
                <small>Pedido {item.quantity} · ya recibido {item.receivedQty} · pendiente {pendingOf(item)}</small>
              </div>
              <div className="drawer-form-grid">
                <div className="drawer-form-field">
                  <label className="drawer-form-label" htmlFor={`receive-qty-${item.id}`}>Llega ahora</label>
                  <input id={`receive-qty-${item.id}`} className="drawer-form-control" type="number" min={0} max={pendingOf(item)} step={1} value={line.quantity} onChange={(e) => form.change(item.id, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} disabled={form.saving} />
                </div>
                <div className="drawer-form-field">
                  <label className="drawer-form-label" htmlFor={`receive-loc-${item.id}`}>Ubicación</label>
                  <select id={`receive-loc-${item.id}`} className="drawer-form-control" value={line.location} onChange={(e) => form.change(item.id, { location: e.target.value })} disabled={form.saving}>
                    <option value="">Elige una ubicación</option>
                    {form.locations.map((location) => (
                      <option key={location.id} value={location.code}>{location.code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" disabled={form.saving} onClick={form.cancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={Boolean(form.problem) || form.saving} title={form.problem ?? undefined}>
          {form.saving ? 'Recibiendo…' : 'Registrar recepción'}
        </button>
      </div>
    </form>
  )
}

export default PurchaseReceivePanel
