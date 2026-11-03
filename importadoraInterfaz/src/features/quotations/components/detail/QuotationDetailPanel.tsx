// QuotationDetailPanel · detalle de una cotización en el panel derecho: código, quién la hizo, cliente, WhatsApp, renglones y total, con el botón «Enviar por WhatsApp»
// conecta con: formRegistry (lo muestra), quotations.thunks (detalle y marcar como enviada), quotations.selectors, quotations.adapter (enlace de WhatsApp) y navigation (closeDrawerForm)
// ojo: «Enviar por WhatsApp» abre WhatsApp con el mensaje armado (la persona lo envía allí) y deja la cotización como «Enviada»; sin número del cliente el botón no aparece
import React, { useEffect } from 'react'
import './QuotationDetailPanel.css'
import { formatPesos } from '@/global/helpers/formatting/format'
import { closeDrawerForm, openDrawerForm } from '@/features/navigation'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { QUOTATION_STATUS_LABEL } from '../../constants/quotations.constants'
import { toWhatsappUrl } from '../../helpers/quotations.adapter'
import { selectQuotationDetail } from '../../selectors/quotations.selectors'
import { loadQuotationDetailThunk, markQuotationSentThunk } from '../../thunks/quotations.thunks'

interface QuotationDetailPanelProps {
  quotationId: number
}

export const QuotationDetailPanel: React.FC<QuotationDetailPanelProps> = ({ quotationId }) => {
  const dispatch = useAppDispatch()
  const detail = useAppSelector(selectQuotationDetail)

  useEffect(() => {
    dispatch(loadQuotationDetailThunk(quotationId))
  }, [dispatch, quotationId])

  if (detail.status === 'failed') return <div className="quotation-detail-body"><div className="form-field-error-msg">{detail.error}</div></div>
  const quotation = detail.data
  if (!quotation || quotation.id !== quotationId) return <div className="quotation-detail-body">Cargando cotización…</div>

  const whatsappUrl = toWhatsappUrl(quotation)
  const sendWhatsapp = () => {
    if (!whatsappUrl) return
    window.open(whatsappUrl, '_blank', 'noopener')
    if (quotation.status === 'draft') dispatch(markQuotationSentThunk(quotation.id))
  }

  const facts: Array<[string, string]> = [
    ['Código', quotation.serialCode],
    ['Estado', QUOTATION_STATUS_LABEL[quotation.status]],
    ['Hecha por', quotation.employeeName || '—'],
    ['Cliente', quotation.customerName || '—'],
    ['WhatsApp', quotation.whatsapp || 'El cliente no tiene celular ni teléfono'],
  ]

  return (
    <div className="quotation-detail">
      <div className="quotation-detail-body">
        <dl className="quotation-detail-facts">
          {facts.map(([label, value]) => (
            <div key={label} className="quotation-detail-fact">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <table className="quotation-detail-items">
          <thead>
            <tr><th>Repuesto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}<small>{item.code}</small></td>
                <td>{item.quantity}</td>
                <td>{formatPesos(item.unitPrice)}</td>
                <td>{formatPesos(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="quotation-detail-total">Total <strong>{formatPesos(quotation.total)}</strong></p>
        {quotation.notes && <p className="quotation-detail-notes">{quotation.notes}</p>}
      </div>

      <div className="quotation-detail-footer">
        <button type="button" className="btn-secondary" onClick={() => dispatch(closeDrawerForm())}>Cerrar</button>
        {whatsappUrl && (
          <button type="button" className="btn-secondary" onClick={sendWhatsapp}>Enviar por WhatsApp</button>
        )}
        {['draft', 'sent', 'accepted'].includes(quotation.status) && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => dispatch(openDrawerForm({ kind: 'checkout', payload: { mode: 'sale', quotationId: quotation.id, customerId: quotation.customerId } }))}
          >
            Continuar a compra
          </button>
        )}
      </div>
    </div>
  )
}

export default QuotationDetailPanel
