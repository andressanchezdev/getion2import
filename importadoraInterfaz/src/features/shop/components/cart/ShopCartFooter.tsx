// ShopCartFooter · pie del carrito (como los totales de la maqueta): subtotal, IVA, total, finalizar compra y crear cotización (vaciar y compartir están en el menú ☰ del encabezado del carrito)
// conecta con: navigation (abre el panel de finalizar compra), usePermissions (permiso de ventas), shop.selectors (total) y shop.helpers (separa el IVA)
// ojo: el subtotal y el IVA (19 %) se calculan como en la maqueta, con los precios con IVA incluido, hasta que el backend envíe los impuestos (ver IVA_RATE en shop.constants)
import React from 'react'
import { formatPesos } from '@/global/helpers/formatting/format'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { selectCartMutating, selectCartTotals } from '../../selectors/shop.selectors'
import { IVA_RATE } from '../../constants/shop.constants'
import { splitIncludedTax } from '../../helpers/shop.helpers'
import './ShopCartFooter.css'

export const ShopCartFooter: React.FC = () => {
  const dispatch = useAppDispatch()
  const { totalAmount, totalItemsCount } = useAppSelector(selectCartTotals)
  const isBusy = useAppSelector(selectCartMutating)
  const { subtotal, tax } = splitIncludedTax(totalAmount)
  const isEmpty = totalItemsCount === 0
  // vender o cotizar es de quien tiene permiso de ventas (el administrador también, pero asigna la venta a un empleado)
  const canSell = usePermissions().canPerformAction('shop', 'orders', 'create')

  // finalizar compra y cotizar abren el mismo panel: cliente y entrega, y después el pago (la cotización termina en el cliente)
  const openCheckout = (mode: 'sale' | 'quotation') => dispatch(openDrawerForm({ kind: 'checkout', payload: { mode } }))

  return (
    <div className="shop-cart-footer">
      <div className="shop-cart-row">
        <span>Subtotal</span>
        <b>{formatPesos(subtotal)}</b>
      </div>
      <div className="shop-cart-row">
        <span>IVA ({Math.round(IVA_RATE * 100)}%)</span>
        <b>{formatPesos(tax)}</b>
      </div>
      <div className="shop-cart-row shop-cart-row-total">
        <span>Total</span>
        <b>{formatPesos(totalAmount)}</b>
      </div>

      <button
        type="button"
        className="shop-cart-btn-checkout"
        disabled={isEmpty || isBusy || !canSell}
        title={canSell ? undefined : 'No tienes permiso de ventas'}
        onClick={() => openCheckout('sale')}
      >
        Finalizar compra
      </button>

      <button type="button" className="shop-cart-btn-quote" disabled={isEmpty || isBusy || !canSell} title={canSell ? undefined : 'No tienes permiso de ventas'} onClick={() => openCheckout('quotation')}>
        Crear cotización
      </button>
    </div>
  )
}

export default ShopCartFooter
