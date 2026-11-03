// InvoicesTable · tarjeta de facturas con buscador, filtros y tabla global
// conecta con: InvoicesScreen (la usa), useInvoices, Pill, Pagination y billing.constants
import React from 'react'
import './InvoicesTable.css'
import { Pill } from '@/global/components/UI/atoms/Pill'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { INVOICE_KIND_LABELS, INVOICE_STATUS, INVOICE_STATUS_OPTIONS } from '../../constants/billing.constants'
import { useInvoices } from '../../hooks/useInvoices'
import type { InvoiceStatus } from '../../types/billing.types'

export const InvoicesTable: React.FC = () => {
  const list = useInvoices()
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
    <div className="invoices-card">
      <div className="invoices-toolbar">
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
              value={list.selectedWarehouseId ? String(list.selectedWarehouseId) : 'all'}
              onChange={(e) => list.setSelectedWarehouseId(!e.target.value || e.target.value === 'all' ? null : Number(e.target.value))}
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

      <div className="invoices-table-responsive table-scroll">
        <table className="invoices-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Tipo</th>
              <th>Bodega</th>
              <th>Pedido / Concepto</th>
              <th>Emitida</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th>PDF</th>
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
                  <td><strong>{invoice.number}</strong></td>
                  <td>{INVOICE_KIND_LABELS[invoice.kind] || invoice.kind}</td>
                  <td>{invoice.warehouseName || 'General'}</td>
                  <td>{invoice.saleSerial}</td>
                  <td>{invoice.issuedAt || '—'}</td>
                  <td>{invoice.employeeName}</td>
                  <td><Pill tone={INVOICE_STATUS[invoice.status]?.tone ?? 'gray'}>{INVOICE_STATUS[invoice.status]?.label ?? invoice.status}</Pill></td>
                  <td>{invoice.pdfUrl ? <a href={invoice.pdfUrl} target="_blank" rel="noreferrer">Abrir</a> : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} label="Paginación de facturas" onPageChange={setPage} />
    </div>
  )
}

export default InvoicesTable
