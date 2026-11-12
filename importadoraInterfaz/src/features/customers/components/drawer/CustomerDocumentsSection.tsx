// CustomerDocumentsSection · documentos del cliente en su panel: tipo, vencimiento con su estado y botones para renovar
// conecta con: useCustomerDocuments (lista y renovar), customers.documents.service (ver el archivo), customers.documents.adapter (textos), usePermissions y global Pill; la pinta CustomerDrawer
// ojo: renovar reinicia la vigencia del documento; «Renovar con archivo» además reemplaza el archivo anterior
import React, { useRef, useState } from 'react'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { formatDate } from '@/global/helpers/formatting/format'
import { toast } from '@/global/helpers/feedback/toast'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { openCustomerDocumentFile } from '../../services/customers.documents.service'
import { useCustomerDocuments } from '../../hooks/useCustomerDocuments'
import { documentTypeLabel, expiryLabel } from '../../helpers/customers.documents.adapter'
import type { DocumentStatus } from '../../types/customers.types'

const STATUS_TONE: Record<DocumentStatus, PillTone> = { valid: 'green', expiring: 'amber', expired: 'red' }

interface Props {
  customerId: number
}

// lista de documentos con su vigencia y la renovación
export const CustomerDocumentsSection: React.FC<Props> = ({ customerId }) => {
  const { items, status, error, saving, renew } = useCustomerDocuments(customerId)
  const fileInput = useRef<HTMLInputElement>(null)
  const canRenew = usePermissions().can('customers:edit') // POST /customers/:id/documents/:docId/renew
  const viewFile = (documentId: number) => openCustomerDocumentFile(customerId, documentId).catch(() => toast.error('No se pudo abrir el archivo del documento.'))
  const [renewingId, setRenewingId] = useState<number | null>(null) // documento que espera el archivo nuevo

  // abre el selector de archivo para renovar ese documento
  const pickFile = (documentId: number) => {
    setRenewingId(documentId)
    fileInput.current?.click()
  }

  // renueva con el archivo elegido (si no se eligió ninguno no hace nada)
  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file && renewingId !== null) renew(renewingId, file)
    setRenewingId(null)
  }

  return (
    <section className="customer-drawer-section">
      <h3 className="customer-drawer-section-title">Documentos</h3>

      {status === 'failed' && <p className="customer-drawer-note customer-drawer-note-error">{error}</p>}
      {status !== 'failed' && items.length === 0 && (
        <p className="customer-drawer-note">{status === 'succeeded' ? 'Este cliente no tiene documentos cargados.' : 'Cargando documentos…'}</p>
      )}

      <ul className="customer-drawer-list">
        {items.map((doc) => (
          <li key={doc.id} className="customer-drawer-list-item">
            <div className="customer-drawer-list-text">
              <span className="customer-drawer-list-main">
                {documentTypeLabel(doc.type)} <Pill tone={STATUS_TONE[doc.status]}>{expiryLabel(doc.status, doc.daysLeft)}</Pill>
              </span>
              <span className="customer-drawer-list-sub">
                {doc.fileName} · vence el {formatDate(doc.expiresAt)}
              </span>
            </div>
            <div className="customer-drawer-doc-actions">
              <button type="button" className="customer-drawer-link-btn" onClick={() => viewFile(doc.id)}>
                Ver archivo
              </button>
              {doc.status !== 'valid' && canRenew && (<>
                <button type="button" className="customer-drawer-link-btn" disabled={saving} onClick={() => renew(doc.id)}>
                  Renovar
                </button>
                <button type="button" className="customer-drawer-link-btn" disabled={saving} onClick={() => pickFile(doc.id)}>
                  Renovar con archivo
                </button>
              </>)}
            </div>
          </li>
        ))}
      </ul>

      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" hidden onChange={onFile} />
    </section>
  )
}

export default CustomerDocumentsSection
