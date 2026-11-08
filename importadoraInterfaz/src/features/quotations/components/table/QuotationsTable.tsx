// QuotationsTable · tabla de cotizaciones: código único, fecha, quién la hizo, cliente, WhatsApp, total, estado y la acción «Ver detalle»
// conecta con: QuotationsScreen (la usa), quotations.selectors (página visible y estado), navigation (openDrawerForm: el detalle se abre en el panel derecho) y RowActions
// ojo: en pantallas menores a 380px las filas se convierten en cards con datos clave destacados y las acciones en el footer de la card
import React from 'react'
import './QuotationsTable.css'
import { formatPesos } from '@/global/helpers/formatting/format'
import { openDrawerForm } from '@/features/navigation'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import continueIcon from '@/assets/icons/receipt.svg?raw'
import { QUOTATION_STATUS_LABEL } from '../../constants/quotations.constants'
import { selectHasQuotationFilters, selectQuotationsError, selectQuotationsStatus, selectQuotationsTableItems } from '../../selectors/quotations.selectors'
import { loadQuotationsThunk } from '../../thunks/quotations.thunks'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

const COLUMNS = 7

const formatDate = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

// tabla de cotizaciones con sus acciones (ver detalle y continuar a compra)
export const QuotationsTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const items = useAppSelector(selectQuotationsTableItems)
  const status = useAppSelector(selectQuotationsStatus)
  const error = useAppSelector(selectQuotationsError)
  const hasFilters = useAppSelector(selectHasQuotationFilters)
  const canSell = usePermissions().canPerformAction('shop', 'orders', 'create')

  const message = (() => {
    if (status === 'failed') return error
    if (items.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando cotizaciones…'
    if (items.length === 0) return hasFilters ? 'No hay cotizaciones con estos filtros.' : 'Aún no hay cotizaciones. Se crean desde el carrito con «Crear cotización».'
    return null
  })()

  return (
    <DataTable tableId="quotations-quotations" className="quotations-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Fecha</th>
            <th>Hecha por</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr>
              <td colSpan={COLUMNS} className="quotations-table-message">
                <p>{message}</p>
                {status === 'failed' && (
                  <button type="button" className="btn-secondary" onClick={() => dispatch(loadQuotationsThunk())}>
                    Reintentar
                  </button>
                )}
              </td>
            </tr>
          ) : (
            items.map((quotation) => (
              <tr key={quotation.id} className="quotations-table-row">
                <td data-label="Código">
                  <span className="quotations-table-code">{quotation.serialCode}</span>
                </td>
                <td data-label="Fecha">{formatDate(quotation.createdAt)}</td>
                <td data-label="Hecha por">{quotation.employeeName || '—'}</td>
                <td data-label="Cliente">
                  <strong className="quotations-table-customer">{quotation.customerName || '—'}</strong>
                </td>
                <td data-label="Total" className="table-amount">{formatPesos(quotation.total)}</td>
                <td data-label="Estado">
                  <span className={`quotations-table-status quotations-table-status-${quotation.status}`}>
                    {QUOTATION_STATUS_LABEL[quotation.status]}
                  </span>
                </td>
                <td className="quotations-table-actions-cell" data-label="Acciones">
                  <div className="quotations-card-footer-actions">
                    <button
                      type="button"
                      className="btn-secondary quotations-btn-compact"
                      onClick={() => dispatch(openDrawerForm({ kind: 'quotationDetail', payload: quotation.id }))}
                      title="Ver detalle"
                    >
                      Ver detalle
                    </button>
                    {canSell && ['draft', 'sent', 'accepted'].includes(quotation.status) && (
                      <button
                        type="button"
                        className="btn-primary quotations-btn-compact"
                        onClick={() => dispatch(openDrawerForm({ kind: 'checkout', payload: { mode: 'sale', quotationId: quotation.id, customerId: quotation.customerId } }))}
                        title="Continuar: pasar a compra"
                      >
                        Continuar a compra
                      </button>
                    )}
                  </div>
                  <div className="quotations-desktop-actions">
                    <RowActions
                      actions={[
                        { key: 'detail', label: 'Ver detalle', icon: eyeIcon, onClick: () => dispatch(openDrawerForm({ kind: 'quotationDetail', payload: quotation.id })) },
                        { key: 'continue', label: 'Continuar: pasar a compra', icon: continueIcon, visible: canSell && ['draft', 'sent', 'accepted'].includes(quotation.status), onClick: () => dispatch(openDrawerForm({ kind: 'checkout', payload: { mode: 'sale', quotationId: quotation.id, customerId: quotation.customerId } })) },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
  )
}

export default QuotationsTable
