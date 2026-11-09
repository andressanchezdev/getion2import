// ShopCartFooter · pie del carrito (como los totales de la maqueta): subtotal, IVA, total, y finalizar compra (vaciar y compartir están en el menú ☰ del encabezado del carrito); las cotizaciones se arman en Tienda > Cotizar
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

  // finalizar compra abre el panel: cliente y entrega, y después el pago
  const openCheckout = () => dispatch(openDrawerForm({ kind: 'checkout', payload: { mode: 'sale' } }))

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
        onClick={openCheckout}
      >
        Finalizar compra
      </button>
    </div>
  )
}

export default ShopCartFooter
