// CreateReturnDrawer · panel lateral «Nueva devolución / garantía»: venta, renglones, causal, resolución y motivo
// conecta con: ReturnsScreen (lo abre) y useCreateReturnForm (todo el estado y el envío); las piezas de cada paso viven en este mismo folder
// ojo: el cuerpo se monta solo al abrir, así cada apertura empieza con el formulario limpio; al crear, el thunk recarga la lista
import React from 'react'
import { useCreateReturnForm } from '../hooks/useCreateReturnForm'
import type { ReturnReasonType, ReturnResolutionType } from '../types/returns.types'
import { ReturnChoiceCards, type ChoiceOption } from './ReturnChoiceCards'
import { ReturnItemsPicker } from './ReturnItemsPicker'
import { ReturnSalePicker } from './ReturnSalePicker'
import './CreateReturnDrawer.css'

const REASON_OPTIONS: ChoiceOption<ReturnReasonType>[] = [
  { value: 'warranty', title: '🛡️ Garantía por Defecto o Falla', description: 'Falla técnica, daño de fábrica o mal funcionamiento del producto.' },
  { value: 'wrong_item', title: '📦 Error en Despacho / Ítem Equivocado', description: 'El producto entregado no coincide con la referencia facturada.' },
]

const RESOLUTION_OPTIONS: ChoiceOption<ReturnResolutionType>[] = [
  { value: 'exchange', title: '🔄 Producto a Cambio (Garantía)', description: 'Se reemplaza físicamente el producto defectuoso por uno en perfecto estado.' },
  { value: 'credit_balance', title: '💳 Saldo a Favor', description: 'Se acredita el valor al cupo / saldo a favor del cliente para próximas compras.' },
]

const DrawerBody: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const form = useCreateReturnForm(onClose)
  return (
    <div className="cr-drawer-backdrop" onClick={onClose}>
      <div className="cr-drawer-container" onClick={(e) => e.stopPropagation()}>
        <header className="cr-drawer-header">
          <div>
            <h3>Nueva Devolución / Garantía</h3>
            <p>Asocia una venta, selecciona productos afectados y define la resolución.</p>
          </div>
          <button type="button" className="cr-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <form onSubmit={(e) => { e.preventDefault(); form.submit() }} className="cr-drawer-body">
          <div className="cr-body-scroll">
            <ReturnSalePicker search={form.search} sales={form.sales} searching={form.searching} sale={form.sale} onSearch={form.setSearch} onSelect={form.selectSale} onClear={form.clearSale} />
            {form.sale && <ReturnItemsPicker sale={form.sale} loading={form.loadingSale} picks={form.picks} onToggle={form.togglePick} onQuantity={form.setPickQuantity} />}
            <div className="cr-form-section">
              <label className="cr-section-label">3. Causal de la Solicitud *</label>
              <ReturnChoiceCards name="reasonType" value={form.reasonType} options={REASON_OPTIONS} onChange={form.setReasonType} />
            </div>
            <div className="cr-form-section">
              <label className="cr-section-label">4. Tipo de Resolución Acordada *</label>
              <ReturnChoiceCards name="resolutionType" value={form.resolutionType} options={RESOLUTION_OPTIONS} onChange={form.setResolutionType} />
            </div>
            {form.reasonType === 'warranty' && (
              <div className="cr-form-section">
                <label className="cr-section-label">5. Evidencias de Garantía *</label>
                <div className="cr-warranty-inputs">
                  <div>
                    <label className="cr-field-label">Foto / Evidencia del defecto (URL o referencia) *</label>
                    <input
                      type="text"
                      className="cr-input"
                      value={form.evidenceUrl}
                      onChange={(e) => form.setEvidenceUrl(e.target.value)}
                      placeholder="Ej: https://evidencias.empresa.com/garantias/foto1.jpg"
                      required
                    />
                  </div>
                  <div>
                    <label className="cr-field-label">Factura / Soporte de venta *</label>
                    <input
                      type="text"
                      className="cr-input"
                      value={form.receiptUrl}
                      onChange={(e) => form.setReceiptUrl(e.target.value)}
                      placeholder="Ej: FACT-00123 o número de factura"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="cr-form-section">
              <label className="cr-section-label">{form.reasonType === 'warranty' ? '6.' : '5.'} Motivo / Justificación *</label>
              <textarea
                value={form.reason}
                onChange={(e) => form.setReason(e.target.value)}
                placeholder="Describe el daño de fábrica, falla detectada, o razón de devolución..."
                rows={3}
                required
                className="cr-textarea"
              />
            </div>
          </div>
          <footer className="cr-drawer-footer">
            <button type="button" className="cr-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="cr-btn-submit" disabled={form.submitting || !form.sale}>
              {form.submitting ? 'Creando devolución...' : 'Confirmar y Crear Devolución'}
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

export const CreateReturnDrawer: React.FC<Props> = ({ isOpen, onClose }) => (isOpen ? <DrawerBody onClose={onClose} /> : null)
