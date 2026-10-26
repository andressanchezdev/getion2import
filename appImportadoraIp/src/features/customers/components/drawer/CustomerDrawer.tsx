// CustomerDrawer · contenido del panel derecho al abrir un cliente: sus datos, "usar en la venta", direcciones y descuentos
// conecta con: useSelectedCustomerData (pide detalle, direcciones y descuentos), customers.selectors y customers.details.thunks, features/shop (cliente de la venta) y global ConfirmDialog (confirmar borrados); lo muestra DrawerRight (drawerRegistry, modo "customer")
// ojo: los borrados (dirección o descuento) piden confirmación; el encabezado del panel lo pinta DrawerHeader con selectCustomerDrawerMeta
import React, { useState } from 'react'
import './CustomerDrawer.css'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { ConfirmDialog } from '@/global/components/UI/molecules/ConfirmDialog'
import { selectCartCustomer, setCartCustomerThunk } from '@/features/shop'
import { useLoadCatalogs } from '@/features/catalogs'
import { useSelectedCustomerData } from '../../hooks/useSelectedCustomerData'
import { selectCustomerDetail, selectOpenCustomerId } from '../../selectors/customers.selectors'
import { deleteDirectionThunk, deleteDiscountThunk } from '../../thunks/customers.details.thunks'
import { CustomerInfoSection } from './CustomerInfoSection'
import { CustomerDirectionsSection } from './CustomerDirectionsSection'
import { CustomerDiscountsSection } from './CustomerDiscountsSection'

// qué se está por borrar (null = nada); se confirma con el diálogo
type PendingDelete = { kind: 'direction' | 'discount'; id: number } | null

export const CustomerDrawer: React.FC = () => {
  const dispatch = useAppDispatch()
  useSelectedCustomerData()
  useLoadCatalogs() // los descuentos muestran el nombre de la marca, categoría o modelo

  const customerId = useAppSelector(selectOpenCustomerId)
  const detail = useAppSelector(selectCustomerDetail)
  const cartCustomer = useAppSelector(selectCartCustomer)
  const [pending, setPending] = useState<PendingDelete>(null)

  if (customerId === null) return null
  const customer = detail.data
  const isSaleCustomer = cartCustomer?.id === customerId

  const handleUseInSale = () => {
    if (isSaleCustomer) dispatch(setCartCustomerThunk(null))
    else if (customer) dispatch(setCartCustomerThunk({ id: customer.id, name: customer.fullName, priceType: customer.priceType }))
  }

  const handleConfirmDelete = () => {
    if (pending?.kind === 'direction') dispatch(deleteDirectionThunk({ customerId, directionId: pending.id }))
    if (pending?.kind === 'discount') dispatch(deleteDiscountThunk({ customerId, discountId: pending.id }))
    setPending(null)
  }

  return (
    <div className="customer-drawer">
      <button
        type="button"
        className={`customer-drawer-sale-btn ${isSaleCustomer ? 'customer-drawer-sale-btn-active' : ''}`}
        onClick={handleUseInSale}
        disabled={!customer}
      >
        {isSaleCustomer ? 'Cliente de la venta · Quitar' : 'Usar en la venta'}
      </button>

      <CustomerInfoSection detail={detail} />
      <CustomerDirectionsSection customerId={customerId} onRequestDelete={(id) => setPending({ kind: 'direction', id })} />
      <CustomerDiscountsSection onRequestDelete={(id) => setPending({ kind: 'discount', id })} />

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'direction' ? '¿Borrar la dirección?' : '¿Borrar el descuento?'}
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}

export default CustomerDrawer
