// QuotationCartDrawer · el carrito de Cotizar en el panel derecho: mismo diseño que el carrito del catálogo, pero solo para cotizaciones (cada repuesto con imagen, cantidad, precios y quitar; pie con subtotal, IVA y total)
// conecta con: drawerRegistry (modo quotationCart), quotationDraft.slice/selectors (renglones), shop (estilos del carrito, TrashIcon, IVA) y checkout (openDrawerForm «checkout» en modo cotización)
// ojo: «Cotizar» abre el mismo panel de finalizar, pero en modo cotización: solo pide el cliente y al crearla se vacía este carrito; no toca el carrito de ventas
import React from 'react'
import '@/features/shop/components/cart/ShopCartDrawer.css'
import '@/features/shop/components/cart/ShopCartItem.css'
import '@/features/shop/components/cart/ShopCartFooter.css'
import '@/features/shop/components/cart/ShopCartEmpty.css'
import { openDrawerForm } from '@/features/navigation'
import { IVA_RATE, TrashIcon, splitIncludedTax } from '@/features/shop'
import { formatPesos } from '@/global/helpers/formatting/format'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { removeDraftLine, setDraftQuantity } from '../../slices/quotationDraft.slice'
import { selectDraftLines, selectDraftTotal } from '../../selectors/quotationDraft.selectors'

export const QuotationCartDrawer: React.FC = () => {
  const dispatch = useAppDispatch()
  const lines = useAppSelector(selectDraftLines)
  const total = useAppSelector(selectDraftTotal)
  const { subtotal, tax } = splitIncludedTax(total)
  const canQuote = usePermissions().can('quotations:create')

  const continueToCustomer = () =>
    dispatch(
      openDrawerForm({
        kind: 'checkout',
        payload: {
          mode: 'quotation',
          lines: lines.map((line) => ({ productId: line.productId, stockId: 0, name: line.name, quantity: line.quantity, unitPrice: line.unitPrice, ivaPercent: line.ivaPercent })),
        },
      })
    )

  return (
    <div className="shop-cart-drawer">
      <div className="shop-cart-items-container">
        {lines.length === 0 ? (
          <div className="shop-cart-empty">
            <p className="shop-cart-empty-text">La cotización está vacía.</p>
            <span className="shop-cart-empty-hint">Selecciona repuestos en el catálogo y haz clic en "Ordenar".</span>
          </div>
        ) : (
          <ul className="shop-cart-list">
            {lines.map((line) => (
              <li key={line.productId} className="shop-cart-item">
                <div className="shop-cart-item-slot">{line.imageUrl && <img className="shop-cart-item-image" src={line.imageUrl} alt="" loading="lazy" />}</div>
                <div className="shop-cart-item-main">
                  <div className="shop-cart-item-top">
                    <div className="shop-cart-item-title">
                      <strong className="shop-cart-item-name" title={line.name}>{line.name.toUpperCase()}</strong>
                    </div>
                  </div>
                  <span className="shop-cart-item-meta">{line.meta}</span>
                  <span className="shop-cart-item-ref">{line.code}</span>
                  <div className="shop-cart-item-foot">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      className="shop-cart-item-qty"
                      value={line.quantity}
                      aria-label={`Cantidad de ${line.name}`}
                      onChange={(event) => dispatch(setDraftQuantity({ productId: line.productId, quantity: Number(event.target.value) }))}
                    />
                    <div className="shop-cart-item-prices">
                      <span>{formatPesos(line.unitPrice)}</span>
                      <span className="shop-cart-item-prices-sep">|</span>
                      <span>{formatPesos(line.unitPrice * line.quantity)}</span>
                    </div>
                    <button type="button" className="shop-cart-item-remove-btn" title="Quitar de la cotización" aria-label={`Quitar ${line.name} de la cotización`} onClick={() => dispatch(removeDraftLine(line.productId))}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shop-cart-footer">
        <div className="shop-cart-row"><span>Subtotal</span><b>{formatPesos(subtotal)}</b></div>
        <div className="shop-cart-row"><span>IVA ({Math.round(IVA_RATE * 100)}%)</span><b>{formatPesos(tax)}</b></div>
        <div className="shop-cart-row shop-cart-row-total"><span>Total</span><b>{formatPesos(total)}</b></div>
        <button type="button" className="shop-cart-btn-checkout" disabled={lines.length === 0 || !canQuote} title={canQuote ? undefined : 'No tienes permiso de ventas'} onClick={continueToCustomer}>
          Cotizar
        </button>
      </div>
    </div>
  )
}

export default QuotationCartDrawer
