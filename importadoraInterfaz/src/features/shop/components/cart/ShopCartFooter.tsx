// ShopCartFooter · pie del carrito (como los totales de la maqueta): subtotal, IVA, total, finalizar compra y vaciar
// conecta con: shop.cart.thunks (vaciar en el backend), shop.selectors (total), shop.helpers (separa el IVA), global toast (aviso de pedido listo)
// ojo: el subtotal y el IVA (19 %) se calculan como en la maqueta, con los precios con IVA incluido, hasta que el backend envíe los impuestos (ver IVA_RATE en shop.constants)
import React from 'react'
import { formatPesos } from '@/global/helpers/format'
import { toast } from '@/global/helpers/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { clearCartThunk } from '../../thunks/shop.cart.update.thunks'
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
        disabled={isEmpty}
        onClick={() => toast.success('¡Pedido listo para confirmación de venta!')}
      >
        Finalizar compra
      </button>

      {!isEmpty && (
        <button type="button" onClick={() => dispatch(clearCartThunk())} disabled={isBusy} className="shop-cart-btn-clear">
          Vaciar carrito
        </button>
      )}
    </div>
  )
}

export default ShopCartFooter
