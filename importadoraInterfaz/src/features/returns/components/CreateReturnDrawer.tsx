// CreateReturnPanel · panel lateral «Nueva devolución / garantía» dentro de DrawerRight
// conecta con: formRegistry (operations.entries), ReturnsScreen y useCreateReturnForm
import React from 'react'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { closeDrawerForm } from '@/features/navigation'
import { useCreateReturnForm } from '../hooks/useCreateReturnForm'
import type { ReturnReasonType, ReturnResolutionType } from '../types/returns.types'
import { ReturnChoiceCards, type ChoiceOption } from './ReturnChoiceCards'
import { ReturnItemsPicker } from './ReturnItemsPicker'
import { ReturnSalePicker } from './ReturnSalePicker'
import './CreateReturnDrawer.css'

const REASON_OPTIONS: ChoiceOption<ReturnReasonType>[] = [
  { value: 'warranty', title: 'Garantía por Defecto o Falla', description: 'Falla técnica, daño de fábrica o mal funcionamiento del producto.' },
  { value: 'wrong_item', title: 'Error en Despacho / Ítem Equivocado', description: 'El producto entregado no coincide con la referencia facturada.' },
]

const RESOLUTION_OPTIONS: ChoiceOption<ReturnResolutionType>[] = [
  { value: 'exchange', title: 'Producto a Cambio (Garantía)', description: 'Se reemplaza físicamente el producto defectuoso por uno en perfecto estado.' },
  { value: 'credit_balance', title: 'Saldo a Favor', description: 'Se acredita el valor al cupo / saldo a favor del cliente para próximas compras.' },
]

export const CreateReturnPanel: React.FC = () => {
  const dispatch = useAppDispatch()
  const form = useCreateReturnForm(() => dispatch(closeDrawerForm()))

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit() }} className="drawer-form">
      <div className="drawer-form-body">
        <ReturnSalePicker search={form.search} sales={form.sales} searching={form.searching} sale={form.sale} onSearch={form.setSearch} onSelect={form.selectSale} onClear={form.clearSale} />
        {form.sale && <ReturnItemsPicker sale={form.sale} loading={form.loadingSale} picks={form.picks} onToggle={form.togglePick} onQuantity={form.setPickQuantity} />}
        <div className="drawer-form-section">
          <label className="drawer-form-section-title">3. Causal de la Solicitud *</label>
          <ReturnChoiceCards name="reasonType" value={form.reasonType} options={REASON_OPTIONS} onChange={form.setReasonType} />
        </div>
        <div className="drawer-form-section">
          <label className="drawer-form-section-title">4. Tipo de Resolución Acordada *</label>
          <ReturnChoiceCards name="resolutionType" value={form.resolutionType} options={RESOLUTION_OPTIONS} onChange={form.setResolutionType} />
        </div>
        {form.reasonType === 'warranty' && (
          <div className="drawer-form-section">
            <label className="drawer-form-section-title">5. Evidencias de Garantía *</label>
            <div className="drawer-form-grid">
              <div className="drawer-form-field">
                <label className="drawer-form-label">Foto / Evidencia del defecto *</label>
                <input
                  type="text"
                  className="drawer-form-input"
                  value={form.evidenceUrl}
                  onChange={(e) => form.setEvidenceUrl(e.target.value)}
                  placeholder="Ej: https://evidencias.empresa.com/foto1.jpg"
                  required
                />
              </div>
              <div className="drawer-form-field">
                <label className="drawer-form-label">Factura / Soporte de venta *</label>
                <input
                  type="text"
                  className="drawer-form-input"
                  value={form.receiptUrl}
                  onChange={(e) => form.setReceiptUrl(e.target.value)}
                  placeholder="Ej: FACT-00123"
                  required
                />
              </div>
            </div>
          </div>
        )}
        <div className="drawer-form-section">
          <label className="drawer-form-section-title">{form.reasonType === 'warranty' ? '6.' : '5.'} Motivo / Justificación *</label>
          <textarea
            value={form.reason}
            onChange={(e) => form.setReason(e.target.value)}
            placeholder="Describe el daño de fábrica, falla detectada, o razón de devolución..."
            rows={3}
            required
            className="drawer-form-textarea"
          />
        </div>
      </div>
      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={form.submitting || !form.sale}>
          {form.submitting ? 'Creando devolución...' : 'Confirmar y Crear Devolución'}
        </button>
      </div>
    </form>
  )
}

export default CreateReturnPanel
