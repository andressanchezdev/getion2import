// ReturnSalePicker · paso 1 del formulario de devolución: buscar una venta y elegirla, o ver la elegida con opción de cambiarla
// conecta con: CreateReturnDrawer; los datos y acciones vienen de useCreateReturnForm
import React from 'react'
import { formatCurrency } from '@/global/helpers/format'
import type { SaleOption } from '../types/returns.types'

interface Props {
  search: string
  sales: SaleOption[]
  searching: boolean
  sale: SaleOption | null
  onSearch: (value: string) => void
  onSelect: (sale: SaleOption) => void
  onClear: () => void
}

export const ReturnSalePicker: React.FC<Props> = ({ search, sales, searching, sale, onSearch, onSelect, onClear }) => (
  <div className="cr-form-section">
    <label className="cr-section-label">1. Buscar Venta Asociada *</label>
    {sale ? (
      <div className="cr-selected-sale-card">
        <div>
          <span className="cr-badge-success">Venta Seleccionada</span>
          <h4>{sale.serial || `Pedido #${sale.id}`}</h4>
          <p>Cliente: {sale.customerName || 'Cliente general'}</p>
          <p>Total: {formatCurrency(sale.total)}</p>
        </div>
        <button type="button" className="cr-btn-change" onClick={onClear}>Cambiar</button>
      </div>
    ) : (
      <div className="cr-search-box">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por código de pedido, cliente o NIT..."
          className="cr-search-input"
        />
        {searching && <span className="cr-search-spinner">Buscando...</span>}
        {sales.length > 0 && (
          <div className="cr-sales-results">
            {sales.map((s) => (
              <button type="button" key={s.id} className="cr-sale-item" onClick={() => onSelect(s)}>
                <div className="cr-sale-info">
                  <strong>{s.serial || `Pedido #${s.id}`}</strong>
                  <span>{s.customerName || 'Cliente general'}</span>
                </div>
                <div className="cr-sale-meta">
                  <span className="cr-sale-price">{formatCurrency(s.total)}</span>
                  <small>{s.createdAt ? s.createdAt.slice(0, 10) : ''}</small>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)
