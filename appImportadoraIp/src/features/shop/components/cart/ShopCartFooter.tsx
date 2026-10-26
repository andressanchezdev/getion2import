// ShopCartFooter · pie del carrito: total a facturar, medio de pago, vaciar y finalizar pedido (con confirmación)
// conecta con: shop.checkout.thunks (registra la venta), shop.cart.thunks (vaciar en el backend), shop.selectors (total y cliente), global ConfirmDialog y toast
// ojo: el crédito solo se ofrece con cliente elegido; finalizar no registra nada hasta confirmar; sin líneas en el carrito el botón queda deshabilitado
import React, { useState } from 'react'
import { formatCOP } from '@/global/helpers/format'
import { ConfirmDialog } from '@/global/components/UI/molecules/ConfirmDialog'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { clearCartThunk } from '../../thunks/shop.cart.update.thunks'
import { checkoutThunk } from '../../thunks/shop.checkout.thunks'
import { selectCartCustomer, selectCartItems, selectCartMutating, selectCartTotals } from '../../selectors/shop.selectors'
import { PAYMENT_METHOD_OPTIONS } from '../../constants/shop.checkout.constants'
import type { PaymentMethod } from '../../types/shop.sales.types'
import './ShopCartFooter.css'

export const ShopCartFooter: React.FC = () => {
  const dispatch = useAppDispatch()
  const { totalAmount } = useAppSelector(selectCartTotals)
  const isBusy = useAppSelector(selectCartMutating)
  const hasItems = useAppSelector(selectCartItems).length > 0
  const customer = useAppSelector(selectCartCustomer)
  const [chosen, setChosen] = useState<PaymentMethod>('cash')
  // el crédito necesita cliente: sin él se vuelve a efectivo y la opción queda deshabilitada
  const method: PaymentMethod = chosen === 'credit' && !customer ? 'cash' : chosen
  const [confirming, setConfirming] = useState(false)

  const confirm = () => {
    setConfirming(false)
    dispatch(checkoutThunk(method))
  }

  return (
    <div className="shop-cart-footer">
      <div className="shop-cart-total-row">
        <span className="shop-cart-total-label">Total a Facturar:</span>
        <span className="shop-cart-total-value">{formatCOP(totalAmount)}</span>
      </div>

      <label className="shop-cart-method">
        <span className="shop-cart-method-label">Medio de pago</span>
        <select className="shop-cart-method-select" value={method} onChange={(event) => setChosen(event.target.value as PaymentMethod)} disabled={isBusy}>
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} disabled={option.value === 'credit' && !customer}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="shop-cart-actions">
        <button type="button" onClick={() => dispatch(clearCartThunk())} disabled={isBusy || !hasItems} className="shop-cart-btn-clear">
          Vaciar
        </button>
        <button type="button" className="shop-cart-btn-checkout" onClick={() => setConfirming(true)} disabled={isBusy || !hasItems}>
          Finalizar Pedido →
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="¿Finalizar el pedido?"
        message={`Se registrará un pedido por ${formatCOP(totalAmount)} para ${customer?.name ?? 'el usuario de la sesión'} con pago en ${PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)?.label.toLowerCase()}.`}
        confirmLabel="Registrar pedido"
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}

export default ShopCartFooter
