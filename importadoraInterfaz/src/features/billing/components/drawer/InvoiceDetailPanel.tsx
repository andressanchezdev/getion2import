// InvoiceDetailPanel · detalle de una factura emitida en el panel derecho: número, tipo, estado, bodega, pedido de origen, fecha, responsable y PDF
// conecta con: formRegistry (invoiceDetail), billing.service (fetchInvoiceById para GET /invoices/:id), billing.constants (textos) y navigation (closeDrawerForm); reemplaza a la ventana flotante que había
import React, { useEffect, useState } from 'react'
import { closeDrawerForm } from '@/features/navigation'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { getErrorMessage } from '@/api/http/errors'
import { INVOICE_KIND_LABELS, INVOICE_STATUS } from '../../constants/billing.constants'
import { fetchInvoiceById } from '../../services/billing.service'
import type { Invoice } from '../../types/billing.types'
import './InvoiceDetailPanel.css'

export const InvoiceDetailPanel: React.FC<{ invoiceId: number }> = ({ invoiceId }) => {
  const dispatch = useAppDispatch()
  const [loaded, setLoaded] = useState<{ id: number; invoice: Invoice | null; error: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchInvoiceById(invoiceId)
      .then((invoice) => !cancelled && setLoaded({ id: invoiceId, invoice, error: null }))
      .catch((error) => !cancelled && setLoaded({ id: invoiceId, invoice: null, error: getErrorMessage(error, 'No se pudo cargar la factura.') }))
    return () => {
      cancelled = true
    }
  }, [invoiceId])

  const ready = loaded?.id === invoiceId
  const invoice = ready ? loaded.invoice : null
  const status = invoice ? INVOICE_STATUS[invoice.status] : null

  const facts: Array<[string, React.ReactNode]> = invoice
    ? [
        ['Número consecutivo', invoice.number],
        ['Tipo de comprobante', INVOICE_KIND_LABELS[invoice.kind] || invoice.kind],
        ['Estado', <Pill key="status" tone={status?.tone ?? 'gray'}>{status?.label ?? invoice.status}</Pill>],
        ['Sede / bodega', invoice.warehouseName || 'General'],
        ['Pedido de origen', `${invoice.saleSerial} (ID #${invoice.saleId})`],
        ['Fecha de emisión', invoice.issuedAt || '—'],
        ['Responsable', invoice.employeeName],
        ['Documento PDF', invoice.pdfUrl ? <a key="pdf" href={invoice.pdfUrl} target="_blank" rel="noreferrer">Descargar PDF oficial</a> : 'Pendiente de generación'],
      ]
    : []

  return (
    <div className="drawer-form">
      <div className="drawer-form-body">
        {!ready && <p className="drawer-form-note">Cargando información de la factura…</p>}
        {ready && loaded.error && <div className="form-field-error-msg">{loaded.error}</div>}
        {invoice && (
          <dl className="invoice-detail-facts">
            {facts.map(([label, value]) => (
              <div key={label} className="invoice-detail-fact">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="drawer-form-footer">
        <button type="button" className="btn-primary" onClick={() => dispatch(closeDrawerForm())}>Cerrar</button>
      </div>
    </div>
  )
}

export default InvoiceDetailPanel
