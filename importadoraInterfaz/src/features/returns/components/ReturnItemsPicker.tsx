// ReturnItemsPicker · paso 2 del formulario de devolución: marcar los renglones de la venta que se devuelven y su cantidad (de 1 a lo vendido)
// conecta con: CreateReturnDrawer; estado de useCreateReturnForm y tipos de returns.helpers
import React from 'react'
import { formatCurrency } from '@/global/helpers/formatting/format'
import type { ItemPick } from '../helpers/returns.helpers'
import type { SaleOption } from '../types/returns.types'

interface Props {
  sale: SaleOption
  loading: boolean
  picks: Record<number, ItemPick>
  onToggle: (itemId: number) => void
  onQuantity: (itemId: number, max: number, quantity: number) => void
}

export const ReturnItemsPicker: React.FC<Props> = ({ sale, loading, picks, onToggle, onQuantity }) => {
  const items = sale.items ?? []
  return (
    <div className="cr-form-section">
      <label className="cr-section-label">2. Productos a Devolver *</label>
      {loading ? (
        <p className="cr-muted">Cargando productos de la venta...</p>
      ) : items.length === 0 ? (
        <p className="cr-muted">No se encontraron ítems detallados para esta venta.</p>
      ) : (
        <div className="cr-items-list">
          {items.map((it) => {
            const pick = picks[it.id] ?? { selected: false, quantity: 1 }
            const max = it.quantity || 999
            return (
              <div key={it.id} className={`cr-item-row ${pick.selected ? 'is-selected' : ''}`}>
                <input type="checkbox" checked={pick.selected} onChange={() => onToggle(it.id)} id={`item-chk-${it.id}`} />
                <label htmlFor={`item-chk-${it.id}`} className="cr-item-details">
                  <strong>{it.productName}</strong>
                  <small>Cód: {it.productCode || 'N/A'} · Valor: {formatCurrency(it.unitPrice)}</small>
                </label>
                {pick.selected && (
                  <div className="cr-qty-picker">
                    <label>Cant:</label>
                    <input type="number" min={1} max={max} value={pick.quantity} onChange={(e) => onQuantity(it.id, max, Number(e.target.value))} />
                    <small>de {it.quantity}</small>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
