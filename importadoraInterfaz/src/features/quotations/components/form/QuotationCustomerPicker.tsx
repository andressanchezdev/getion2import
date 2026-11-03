// QuotationCustomerPicker · paso 1 de la cotización: buscar un cliente y elegirlo, o ver el elegido con opción de cambiarlo
// conecta con: CreateQuotationDrawer; datos y acciones de useQuotationForm
import React from 'react'
import type { QuotationCustomerOption } from '../../types/quotations.types'

interface Props {
  text: string
  results: QuotationCustomerOption[]
  searching: boolean
  customer: QuotationCustomerOption | null
  onText: (value: string) => void
  onPick: (option: QuotationCustomerOption) => void
  onClear: () => void
}

export const QuotationCustomerPicker: React.FC<Props> = ({ text, results, searching, customer, onText, onPick, onClear }) => (
  <div className="cq-form-section">
    <label className="cq-section-label">1. Cliente de la Cotización</label>
    {customer ? (
      <div className="cq-selected-card">
        <div>
          <span className="cq-badge-success">Cliente Asignado</span>
          <h4>{customer.name}</h4>
          <small>Doc: {customer.identification || 'N/A'}</small>
        </div>
        <button type="button" className="cq-btn-remove-client" onClick={onClear}>Cambiar</button>
      </div>
    ) : (
      <div className="cq-search-box">
        <input
          type="text"
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Buscar cliente por nombre o documento... (o dejar mostrador)"
          className="cq-search-input"
        />
        {searching && <span className="cq-search-spinner">Buscando...</span>}
        {results.length > 0 && (
          <div className="cq-results-dropdown">
            {results.map((c) => (
              <button type="button" key={c.id} className="cq-dropdown-item" onClick={() => onPick(c)}>
                <strong>{c.name}</strong>
                <small>Doc: {c.identification || 'N/A'} {c.phone && `· Tel: ${c.phone}`}</small>
              </button>
            ))}
          </div>
        )}
        <small className="cq-hint">Si no seleccionas un cliente, se asignará a Cliente General (Mostrador).</small>
      </div>
    )}
  </div>
)
