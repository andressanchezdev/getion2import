// CreditCustomerPicker · buscador y lista de clientes para elegir a quién habilitar crédito
// conecta con: EnableCreditPanel (lo pinta, solo cuando el cliente aún no está elegido)
import React from 'react'
import type { CreditCustomerOption } from '../../../types/wallet.types'

interface CreditCustomerPickerProps {
  query: string
  onQuery: (value: string) => void
  customers: CreditCustomerOption[]
  loading: boolean
  selectedId?: number | string
  onSelect: (customer: CreditCustomerOption) => void
}

// caja de búsqueda y lista de clientes encontrados
export const CreditCustomerPicker: React.FC<CreditCustomerPickerProps> = ({ query, onQuery, customers, loading, selectedId, onSelect }) => (
  <div className="enable-credit-section">
    <label className="enable-credit-label">Buscar y Seleccionar Cliente</label>
    <div className="enable-credit-search-box">
      <input
        type="text"
        className="enable-credit-input"
        placeholder="Escribe NIT, cédula o nombre del cliente…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      {loading && <span className="enable-credit-spinner">Buscando…</span>}
    </div>

    <div className="enable-credit-customers-list">
      {customers.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`enable-credit-customer-item ${selectedId === c.id ? 'is-selected' : ''}`}
          onClick={() => onSelect(c)}
        >
          <div className="enable-credit-customer-name">{c.name}</div>
          <div className="enable-credit-customer-meta">
            <span>Doc: {c.identification || 'N/A'}</span>
            {c.isCredit && <span className="enable-credit-badge-has">Tiene crédito</span>}
          </div>
        </button>
      ))}
      {!loading && customers.length === 0 && <p className="enable-credit-empty">No se encontraron clientes para mostrar.</p>}
    </div>
  </div>
)

export default CreditCustomerPicker
