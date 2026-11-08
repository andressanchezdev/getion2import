// InvoicesTable · tarjeta de facturas con buscador, filtros, tabla global, detalle en el panel derecho y la acción «Anular» (con motivo en el panel derecho)
// conecta con: InvoicesScreen (la usa), useInvoices (anular), Pill, Pagination, ReasonPrompt, usePermissions y billing.constants
// ojo: «Anular» solo aparece en facturas emitidas y a quien tiene permiso de eliminar en ventas; la factura no se borra, queda anulada y auditada
import React, { useState } from 'react'
import './InvoicesTable.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { ReasonPrompt } from '@/features/reasonPrompt'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import fileTextIcon from '@/assets/icons/file-text.svg?raw'
import banIcon from '@/assets/icons/ban.svg?raw'
import { INVOICE_KIND_LABELS, INVOICE_STATUS, INVOICE_STATUS_OPTIONS } from '../../constants/billing.constants'
import { useInvoices } from '../../hooks/useInvoices'
import type { Invoice, InvoiceStatus } from '../../types/billing.types'
import { openDrawerForm } from '@/features/navigation'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

export const InvoicesTable: React.FC = () => {
  const list = useInvoices()
  const dispatch = useAppDispatch()
  const [toAnnul, setToAnnul] = useState<Invoice | null>(null)
  const canAnnul = usePermissions().canPerformAction('sales', 'orders', 'delete')
  const { pageItems, meta, setPage } = usePagedList(list.items, `${list.search}|${list.status}|${list.selectedWarehouseId}`)

  const warehouseOptions = [
    { value: 'all', label: 'Todas las bodegas' },
    ...list.warehouses.map((wh) => ({ value: String(wh.id), label: wh.name })),
  ]

  const message = list.failed
    ? list.error
    : list.loading
    ? 'Cargando facturas y comprobantes…'
    : list.items.length === 0
    ? list.hasFilters
      ? 'No hay facturas que coincidan con los filtros aplicados.'
      : 'Todavía no hay facturas o comprobantes registrados.'
    : null

  return (
    <div className="data-card">
      <div className="data-toolbar invoices-toolbar">
        <SearchBar
          value={list.search}
          onChange={list.setSearch}
          hasActiveFilters={list.hasFilters}
          onClear={list.clearFilters}
          placeholder="Buscar por número de factura o pedido..."
          className="invoices-search"
        />
        <div className="invoices-toolbar-middle">
          <label className="invoices-toolbar-filter">
            <span>Bodega:</span>
            <select
              className="invoices-toolbar-select"
              value={list.selectedWarehouseId === null ? 'all' : String(list.selectedWarehouseId)}
              onChange={(e) => list.setSelectedWarehouseId(e.target.value === 'all' ? null : Number(e.target.value))}
            >
              {warehouseOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="invoices-toolbar-filter">
            <span>Estado:</span>
            <select
              className="invoices-toolbar-select"
              value={list.status}
              onChange={(e) => list.setStatus((e.target.value || 'all') as InvoiceStatus | 'all')}
            >
              {INVOICE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="invoices-toolbar-actions">
          <span className="invoices-count" aria-live="polite">
            {list.items.length} de {list.total} comprobantes
          </span>
        </div>
      </div>

      <DataTable tableId="billing-invoices">
          <thead>
            <tr>
              <th>Número</th>
              <th>Tipo</th>
              <th>Bodega</th>
              <th>Pedido / Concepto</th>
              <th>Emitida</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={8} className="invoices-empty">{message}</td>
              </tr>
            ) : (
              pageItems.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <button
                      type="button"
                      className="invoices-number-btn"
                      onClick={() => dispatch(openDrawerForm({ kind: 'invoiceDetail', payload: invoice.id }))}
                      title="Ver detalle completo de la factura"
                    >
                      {invoice.number}
                    </button>
                  </td>
                  <td>{INVOICE_KIND_LABELS[invoice.kind] || invoice.kind}</td>
                  <td>{invoice.warehouseName || 'General'}</td>
                  <td>{invoice.saleSerial}</td>
                  <td>{invoice.issuedAt || '—'}</td>
                  <td>{invoice.employeeName}</td>
                  <td><Pill tone={INVOICE_STATUS[invoice.status]?.tone ?? 'gray'}>{INVOICE_STATUS[invoice.status]?.label ?? invoice.status}</Pill></td>
                  <td>
                    <RowActions
                      actions={[
                        {
                          key: 'detail',
                          label: `Ver detalle de factura ${invoice.number}`,
                          icon: eyeIcon,
                          onClick: () => dispatch(openDrawerForm({ kind: 'invoiceDetail', payload: invoice.id })),
                        },
                        {
                          key: 'annul',
                          label: `Anular factura ${invoice.number}`,
                          icon: banIcon,
                          tone: 'danger',
                          visible: invoice.status === 'issued' && canAnnul,
                          onClick: () => setToAnnul(invoice),
                        },
                        {
                          key: 'pdf',
                          label: `Abrir PDF de factura ${invoice.number}`,
                          icon: fileTextIcon,
                          visible: Boolean(invoice.pdfUrl),
                          onClick: () => {
                            if (invoice.pdfUrl) window.open(invoice.pdfUrl, '_blank', 'noopener,noreferrer')
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      <Pagination meta={meta} label="Paginación de facturas" onPageChange={setPage} />

      <ReasonPrompt
        open={toAnnul !== null}
        title="Anular factura"
        message={`¿Anular la factura ${toAnnul?.number ?? ''}? No se borra: queda como anulada y con su motivo en la auditoría.`}
        confirmLabel="Anular"
        onConfirm={(reason) => {
          const target = toAnnul
          setToAnnul(null)
          if (target) void list.annul(target, reason)
        }}
        onCancel={() => setToAnnul(null)}
      />
    </div>
  )
}

export default InvoicesTable
