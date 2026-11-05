// InvoiceDetailModal · visualizador de detalle de una factura emitida
// conecta con: billing.service (fetchInvoiceById para GET /invoices/:id)
import React, { useEffect, useState } from 'react'
import { fetchInvoiceById } from '../../services/billing.service'
import type { Invoice } from '../../types/billing.types'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { INVOICE_KIND_LABELS, INVOICE_STATUS } from '../../constants/billing.constants'
import './InvoiceDetailModal.css'

interface InvoiceDetailModalProps {
  invoiceId: number | null
  onClose: () => void
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoiceId, onClose }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!invoiceId) return

    let isMounted = true
    void Promise.resolve().then(() => {
      if (!isMounted) return
      setLoading(true)
      setError(null)

      fetchInvoiceById(invoiceId)
        .then((data) => {
          if (isMounted) setInvoice(data)
        })
        .catch((err) => {
          if (isMounted) setError(err.message || 'No se pudo cargar la factura')
        })
        .finally(() => {
          if (isMounted) setLoading(false)
        })
    })

    return () => {
      isMounted = false
    }
  }, [invoiceId])

  if (!invoiceId) return null

  return (
    <div className="invoice-detail-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="invoice-detail-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-detail-modal-header">
          <h3 className="invoice-detail-modal-title">
            Detalle de Factura {invoice ? invoice.number : `#${invoiceId}`}
          </h3>
          <button
            type="button"
            className="invoice-detail-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="invoice-detail-modal-body">
          {loading && <p>Cargando información de la factura...</p>}
          {error && <p style={{ color: 'var(--danger-600, #dc2626)' }}>{error}</p>}
          {invoice && (
            <div className="invoice-detail-grid">
              <div className="invoice-detail-field">
                <span className="invoice-detail-field-label">Número Consecutivo</span>
                <span className="invoice-detail-field-value">{invoice.number}</span>
              </div>
              <div className="invoice-detail-field">
                <span className="invoice-detail-field-label">Tipo de Comprobante</span>
                <span className="invoice-detail-field-value">
                  {INVOICE_KIND_LABELS[invoice.kind] || invoice.kind}
                </span>
              </div>
              <div className="invoice-detail-field">
                <span className="invoice-detail-field-label">Estado</span>
                <span className="invoice-detail-field-value">
                  <Pill tone={INVOICE_STATUS[invoice.status]?.tone ?? 'gray'}>
                    {INVOICE_STATUS[invoice.status]?.label ?? invoice.status}
                  </Pill>
                </span>
              </div>
              <div className="invoice-detail-field">
                <span className="invoice-detail-field-label">Sede / Bodega</span>
                <span className="invoice-detail-field-value">
                  {invoice.warehouseName || 'General'}
                </span>
              </div>
              <div className="invoice-detail-field">
                <span className="invoice-detail-field-label">Pedido / Venta de Origen</span>
                <span className="invoice-detail-field-value">
                  {invoice.saleSerial} (ID #{invoice.saleId})
                </span>
              </div>
              <div className="invoice-detail-field">
                <span className="invoice-detail-field-label">Fecha de Emisión</span>
                <span className="invoice-detail-field-value">{invoice.issuedAt || '—'}</span>
              </div>
              <div className="invoice-detail-field">
                <span className="invoice-detail-field-label">Responsable</span>
                <span className="invoice-detail-field-value">{invoice.employeeName}</span>
              </div>
              <div className="invoice-detail-field">
                <span className="invoice-detail-field-label">Documento PDF</span>
                <span className="invoice-detail-field-value">
                  {invoice.pdfUrl ? (
                    <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-600, #2563eb)' }}>
                      Descargar PDF Oficial
                    </a>
                  ) : (
                    'Pendiente de generación'
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="invoice-detail-modal-footer">
          <button
            type="button"
            className="invoice-detail-btn invoice-detail-btn-primary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default InvoiceDetailModal
