// CreateQuotationDrawer · panel lateral «Nueva cotización»: cliente, productos con su cantidad y precio, notas y total
// conecta con: QuotationsScreen (lo abre), useQuotationForm (todo el estado y el envío) y las piezas de components/form
// ojo: el cuerpo se monta solo al abrir, así cada apertura empieza limpia; al crear, el thunk recarga la lista
import React from 'react'
import { formatCurrency } from '@/global/helpers/formatting/format'
import { useQuotationForm } from '../hooks/useQuotationForm'
import { QuotationCustomerPicker } from './form/QuotationCustomerPicker'
import { QuotationItemsEditor } from './form/QuotationItemsEditor'
import './CreateQuotationDrawer.css'

const DrawerBody: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const form = useQuotationForm(onClose)
  return (
    <div className="cq-drawer-backdrop" onClick={onClose}>
      <div className="cq-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <header className="cq-drawer-header">
          <div>
            <h3 className="cq-drawer-title">Nueva Cotización</h3>
            <p className="cq-drawer-subtitle">Genera una cotización seleccionando cliente y agregando productos del catálogo.</p>
          </div>
          <button type="button" className="cq-drawer-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        <form onSubmit={(e) => { e.preventDefault(); form.submit() }} className="cq-drawer-body">
          <div className="cq-body-scroll">
            <QuotationCustomerPicker
              text={form.customerText}
              results={form.customerResults}
              searching={form.searchingCustomer}
              customer={form.customer}
              onText={form.setCustomerText}
              onPick={form.pickCustomer}
              onClear={form.clearCustomer}
            />
            <QuotationItemsEditor
              text={form.productText}
              results={form.productResults}
              searching={form.searchingProduct}
              items={form.items}
              onText={form.setProductText}
              onAdd={form.addProduct}
              onQuantity={form.setQuantity}
              onPrice={form.setPrice}
              onRemove={form.removeItem}
            />
            <div className="cq-form-section">
              <label className="cq-section-label">3. Notas u Observaciones</label>
              <textarea
                value={form.notes}
                onChange={(e) => form.setNotes(e.target.value)}
                placeholder="Condiciones comerciales, validez de la oferta, plazos de entrega..."
                rows={2}
                className="cq-textarea"
              />
            </div>
            <div className="cq-summary-card">
              <div className="cq-summary-row">
                <span>Renglones cotizados:</span>
                <strong>{form.items.length} productos</strong>
              </div>
              <div className="cq-summary-row cq-summary-total">
                <span>Total Cotizado:</span>
                <span className="cq-total-val">{formatCurrency(form.total)}</span>
              </div>
            </div>
          </div>

          <footer className="cq-drawer-footer">
            <button type="button" className="cq-btn-cancel" onClick={onClose} disabled={form.submitting}>Cancelar</button>
            <button type="submit" className="cq-btn-submit" disabled={form.submitting || form.items.length === 0}>
              {form.submitting ? 'Creando cotización...' : 'Confirmar y Crear Cotización'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const CreateQuotationDrawer: React.FC<Props> = ({ isOpen, onClose }) => (isOpen ? <DrawerBody onClose={onClose} /> : null)
