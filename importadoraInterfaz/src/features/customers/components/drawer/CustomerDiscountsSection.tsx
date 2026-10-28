// CustomerDiscountsSection · descuentos del cliente: a qué aplican (producto, marca, categoría o modelo), porcentaje y botón de borrar
// conecta con: customers.selectors (descuentos), features/catalogs (nombres de marca, categoría y modelo); el borrado lo confirma CustomerDrawer
// ojo: por ahora solo se listan y se borran; crear o editar un descuento queda para después (el servicio del backend existe)
import React from 'react'
import { useAppSelector } from '@/global/hooks/useRedux'
import { selectBrands, selectCategories, selectMotoModels } from '@/features/catalogs'
import { selectCustomerDiscounts } from '../../selectors/customers.selectors'
import type { Discount } from '../../types/customers.types'

interface Props {
  onRequestDelete: (discountId: number) => void
}

export const CustomerDiscountsSection: React.FC<Props> = ({ onRequestDelete }) => {
  const discounts = useAppSelector(selectCustomerDiscounts)
  const brands = useAppSelector(selectBrands)
  const categories = useAppSelector(selectCategories)
  const models = useAppSelector(selectMotoModels)

  // "a qué aplica" el descuento: el primero que venga con id
  const targetOf = (discount: Discount): string => {
    if (discount.productId) return `Producto #${discount.productId}`
    if (discount.brandId) return `Marca: ${brands.find((b) => b.id === discount.brandId)?.name ?? `#${discount.brandId}`}`
    if (discount.categoryId) return `Categoría: ${categories.find((c) => c.id === discount.categoryId)?.name ?? `#${discount.categoryId}`}`
    if (discount.modelId) return `Modelo: ${models.find((m) => m.id === discount.modelId)?.name ?? `#${discount.modelId}`}`
    return 'Todos los productos'
  }

  return (
    <section className="customer-drawer-section">
      <h3 className="customer-drawer-section-title">Descuentos</h3>

      {discounts.status === 'failed' && <p className="customer-drawer-note customer-drawer-note-error">{discounts.error}</p>}
      {discounts.status !== 'failed' && discounts.items.length === 0 && (
        <p className="customer-drawer-note">{discounts.status === 'succeeded' ? 'Este cliente no tiene descuentos.' : 'Cargando descuentos…'}</p>
      )}

      <ul className="customer-drawer-list">
        {discounts.items.map((discount) => (
          <li key={discount.id} className="customer-drawer-list-item">
            <div className="customer-drawer-list-text">
              <span className="customer-drawer-list-main">
                {discount.rate} % · {targetOf(discount)}
              </span>
              <span className="customer-drawer-list-sub">
                {[discount.quantity > 0 && `Desde ${discount.quantity} unidades`, !discount.isActive && 'Inactivo'].filter(Boolean).join(' · ')}
              </span>
            </div>
            <button
              type="button"
              className="customer-drawer-remove-btn"
              onClick={() => onRequestDelete(discount.id)}
              disabled={discounts.saving}
              aria-label={`Borrar el descuento de ${discount.rate} %`}
              title="Borrar descuento"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default CustomerDiscountsSection
