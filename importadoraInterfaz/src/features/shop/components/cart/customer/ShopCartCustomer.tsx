// ShopCartCustomer · franja del carrito que muestra a qué cliente se le hace la venta y permite quitarlo
// conecta con: shop.selectors (cliente de la venta y si hay un cambio en curso) y shop.cart.customer.thunks (quitar); la pinta ShopCartDrawer
// ojo: solo aparece si hay un cliente elegido (se elige en Terceros > Clientes, "Usar en la venta"); sin cliente la venta va a nombre del usuario de la sesión
import React from 'react'
import './ShopCartCustomer.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { setCartCustomerThunk } from '../../../thunks/shop.cart.customer.thunks'
import { selectCartCustomer, selectCartMutating } from '../../../selectors/shop.selectors'

export const ShopCartCustomer: React.FC = () => {
  const dispatch = useAppDispatch()
  const customer = useAppSelector(selectCartCustomer)
  const isBusy = useAppSelector(selectCartMutating)

  if (!customer) return null

  return (
    <div className="shop-cart-customer">
      <div className="shop-cart-customer-text">
        <span className="shop-cart-customer-label">Venta a nombre de</span>
        <span className="shop-cart-customer-name">{customer.name}</span>
      </div>
      <button
        type="button"
        className="shop-cart-customer-remove"
        onClick={() => dispatch(setCartCustomerThunk(null))}
        disabled={isBusy}
        title="Quitar cliente de la venta"
        aria-label="Quitar cliente de la venta"
      >
        ✕
      </button>
    </div>
  )
}

export default ShopCartCustomer
