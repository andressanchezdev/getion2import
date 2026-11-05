// QuotationItemsEditor · paso 2 de la cotización: buscar productos, agregarlos y ajustar cantidad y precio de cada renglón
// conecta con: CreateQuotationDrawer; datos y acciones de useQuotationForm
import React from 'react'
import { formatCurrency } from '@/global/helpers/formatting/format'
import type { QuotationItemDraft, QuotationProductOption } from '../../types/quotations.types'

interface Props {
  text: string
  results: QuotationProductOption[]
  searching: boolean
  items: QuotationItemDraft[]
  onText: (value: string) => void
  onAdd: (option: QuotationProductOption) => void
  onQuantity: (productId: number, quantity: number) => void
  onPrice: (productId: number, price: number) => void
  onRemove: (productId: number) => void
}

export const QuotationItemsEditor: React.FC<Props> = ({ text, results, searching, items, onText, onAdd, onQuantity, onPrice, onRemove }) => (
  <div className="cq-form-section">
    <label className="cq-section-label">2. Agregar Productos *</label>
    <div className="cq-search-box">
      <input
        type="text"
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder="Buscar producto por código, nombre o referencia..."
        className="cq-search-input"
      />
      {searching && <span className="cq-search-spinner">Buscando...</span>}
      {results.length > 0 && (
        <div className="cq-results-dropdown">
          {results.map((p) => (
            <button type="button" key={p.id} className="cq-dropdown-item" onClick={() => onAdd(p)}>
              <div className="cq-prod-meta">
                <strong>{p.name}</strong>
                <small>Cód: {p.code}</small>
              </div>
              <span className="cq-prod-price">{formatCurrency(p.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>

    <div className="cq-items-container">
      {items.length === 0 ? (
        <div className="cq-empty-items">
          <p>No has agregado ningún producto a esta cotización.</p>
          <small>Usa el buscador superior para agregar referencias.</small>
        </div>
      ) : (
        <div className="cq-items-table">
          <div className="cq-table-header">
            <span>Producto</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">Precio Unit.</span>
            <span className="text-right">Subtotal</span>
            <span></span>
          </div>
          {items.map((it) => (
            <div key={it.productId} className="cq-table-row">
              <div className="cq-item-name">
                <strong>{it.productName}</strong>
                <small>{it.productCode}</small>
              </div>
              <div className="cq-item-qty">
                <input type="number" min={1} value={it.quantity} onChange={(e) => onQuantity(it.productId, Number(e.target.value))} />
              </div>
              <div className="cq-item-price">
                <input type="number" min={0} value={it.unitPrice} onChange={(e) => onPrice(it.productId, Number(e.target.value))} />
              </div>
              <div className="cq-item-total">{formatCurrency(it.quantity * it.unitPrice)}</div>
              <div className="cq-item-delete">
                <button type="button" onClick={() => onRemove(it.productId)} title="Eliminar producto" className="cq-btn-del">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)
