// PurchaseDetailPanel · detalle de una orden de compra en el panel derecho: datos de la orden, renglones con lo pedido y lo recibido, y las acciones (recibir, Excel, anular)
// conecta con: usePurchaseDetail (la orden con sus renglones), usePurchaseActions (Excel y anular), purchases.rules (qué acciones caben), Pill, ConfirmDialog, global format y navigation (abre la recepción); lo abre formRegistry («purchaseDetail»)
// ojo: anular solo aparece en una orden pedida sin nada recibido; al anular bien el panel se cierra
import React, { useState } from 'react'
import '@/global/components/UI/molecules/form/DrawerFormShell.css'
import './PurchasePanels.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { InlineConfirm } from '@/global/components/UI/molecules/dialogs/InlineConfirm'
import { ProductLine, ProductLineList } from '@/global/components/UI/molecules/product/ProductLine'
import { useProductImages } from '@/features/shop'
import { formatCOP } from '@/global/helpers/formatting/format'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { PURCHASE_STATUS } from '../../constants/purchases.constants'
import { canReceive, canVoid, pendingOf } from '../../helpers/purchases.rules'
import { usePurchaseActions } from '../../hooks/usePurchaseActions'
import { usePurchaseDetail } from '../../hooks/usePurchaseDetail'

export interface PurchasePanelPayload {
  id: number
}

export const PurchaseDetailPanel: React.FC<{ payload: PurchasePanelPayload }> = ({ payload }) => {
  const dispatch = useAppDispatch()
  const detail = usePurchaseDetail(payload.id)
  const actions = usePurchaseActions()
  const [confirmVoid, setConfirmVoid] = useState(false)
  const purchase = detail.purchase
  const images = useProductImages((purchase?.items ?? []).map((item) => item.productId))

  if (!purchase) {
    return (
      <div className="drawer-form">
        <div className="drawer-form-body">
          <div className={detail.failed ? 'form-field-error-msg' : 'drawer-form-note'}>{detail.failed ? detail.error : 'Cargando la orden…'}</div>
          {detail.failed && <button type="button" className="btn-secondary" onClick={detail.reload}>Reintentar</button>}
        </div>
      </div>
    )
  }

  const status = PURCHASE_STATUS[purchase.status]
  const doVoid = async () => {
    setConfirmVoid(false)
    if (await actions.voidOrder(purchase)) dispatch(closeDrawerForm())
  }

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        <section className="drawer-form-section">
          <dl className="purchase-facts">
            <div><dt>Estado</dt><dd><Pill tone={status.tone}>{status.label}</Pill></dd></div>
            <div><dt>Proveedor</dt><dd>{purchase.supplierName}</dd></div>
            <div><dt>Bodega</dt><dd>{purchase.warehouseName || '—'}</dd></div>
            <div><dt>Creó</dt><dd>{purchase.employeeName} · {purchase.createdAt || '—'}</dd></div>
            <div><dt>Fecha esperada</dt><dd>{purchase.expectedDate || '—'}</dd></div>
            <div><dt>Referencia del proveedor</dt><dd>{purchase.supplierRef || '—'}</dd></div>
            {purchase.receivedAt && <div><dt>Recibida</dt><dd>{purchase.receivedAt}</dd></div>}
          </dl>
          {purchase.notes && <p className="drawer-form-note">{purchase.notes}</p>}
        </section>

        <section className="drawer-form-section">
          <ProductLineList>
            {purchase.items.map((item) => (
              <ProductLine
                key={item.id}
                name={item.productName}
                code={item.productCode}
                imageUrl={images[item.productId]}
                quantity={item.quantity}
                unitPrice={item.unitCost}
                note={`Recibido ${item.receivedQty}${pendingOf(item) > 0 ? ` · faltan ${pendingOf(item)}` : ''}`}
              />
            ))}
          </ProductLineList>
                    <dl className="purchase-facts">
            <div><dt>Subtotal</dt><dd>{formatCOP(purchase.subtotal)}</dd></div>
            <div><dt>IVA</dt><dd>{formatCOP(purchase.ivaTotal)}</dd></div>
            <div><dt>Total</dt><dd><strong>{formatCOP(purchase.total)}</strong></dd></div>
          </dl>
        </section>
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => actions.exportExcel(purchase)}>Bajar Excel</button>
        {canVoid(purchase) && <button type="button" className="btn-secondary" disabled={actions.saving} onClick={() => setConfirmVoid(true)}>Anular</button>}
        {canReceive(purchase) && <button type="button" className="btn-primary" onClick={() => dispatch(openDrawerForm({ kind: 'purchaseReceive', payload: { id: purchase.id } }))}>Recibir mercancía</button>}
      </div>

      <InlineConfirm open={confirmVoid} title="Anular orden de compra" message={`¿Anular la orden ${purchase.serial}? No se puede deshacer.`} confirmLabel="Anular" onConfirm={doVoid} onCancel={() => setConfirmVoid(false)} />
    </div>
  )
}

export default PurchaseDetailPanel
