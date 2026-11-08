// QuotationDraftPanel · la cotización en armado en el panel derecho: cada repuesto con su imagen, cantidad editable y total, y el paso al cliente
// conecta con: formRegistry (quotationDraft), quotationDraft.slice/selectors (renglones), ProductLine (la línea de producto) y checkout (openDrawerForm «checkout» en modo cotización)
// ojo: «Continuar» abre el mismo panel de finalizar, pero en modo cotización: solo pide el cliente y al crearla se vacía este borrador
import React from 'react'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { ProductLine, ProductLineList } from '@/global/components/UI/molecules/product/ProductLine'
import { formatPesos } from '@/global/helpers/formatting/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { clearDraft, removeDraftLine, setDraftQuantity } from '../../slices/quotationDraft.slice'
import { selectDraftLines, selectDraftTotal } from '../../selectors/quotationDraft.selectors'
import './QuotationDraftPanel.css'

export const QuotationDraftPanel: React.FC = () => {
  const dispatch = useAppDispatch()
  const lines = useAppSelector(selectDraftLines)
  const total = useAppSelector(selectDraftTotal)

  const continueToCustomer = () =>
    dispatch(
      openDrawerForm({
        kind: 'checkout',
        payload: {
          mode: 'quotation',
          lines: lines.map((line) => ({ productId: line.productId, stockId: 0, name: line.name, quantity: line.quantity, unitPrice: line.unitPrice, ivaPercent: line.ivaPercent })),
        },
      })
    )

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        {lines.length === 0 && <p className="drawer-form-note">Aún no hay repuestos en la cotización. Usa «Ordenar» en las tarjetas del catálogo para agregarlos.</p>}
        <ProductLineList>
          {lines.map((line) => (
            <ProductLine
              key={line.productId}
              name={line.name}
              code={line.code}
              imageUrl={line.imageUrl}
              meta={line.meta}
              quantity={line.quantity}
              unitPrice={line.unitPrice}
              total={line.quantity * line.unitPrice}
              trailing={
                <div className="quotation-draft-controls">
                  <input
                    type="number"
                    min={1}
                    className="drawer-form-control"
                    style={{ width: '4.5rem' }}
                    value={line.quantity}
                    onChange={(event) => dispatch(setDraftQuantity({ productId: line.productId, quantity: Number(event.target.value) }))}
                    aria-label={`Cantidad de ${line.name}`}
                  />
                  <button type="button" className="btn-secondary" onClick={() => dispatch(removeDraftLine(line.productId))} aria-label={`Quitar ${line.name}`}>Quitar</button>
                </div>
              }
            />
          ))}
        </ProductLineList>
        {lines.length > 0 && <p className="drawer-form-note">Total de la cotización: <strong>{formatPesos(total)}</strong></p>}
      </div>

      <div className="drawer-form-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cerrar</button>
        {lines.length > 0 && <button type="button" className="btn-secondary" onClick={() => dispatch(clearDraft())}>Vaciar</button>}
        <button type="button" className="btn-primary" disabled={lines.length === 0} onClick={continueToCustomer}>Continuar</button>
      </div>
    </div>
  )
}

export default QuotationDraftPanel
