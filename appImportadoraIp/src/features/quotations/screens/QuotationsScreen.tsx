// QuotationsScreen · pantalla de Tienda > Cotizaciones (solo consulta): totales, filtro de estado, tabla con vigencia y total, y paginador
// conecta con: quotations.selectors/slice (lista, filtro y totales), useQuotationsLoader (los pide), global StatCard, Pagination y TableMessageRow; la monta MainContent (screenRegistry)
// ojo: no crea, envía ni convierte cotizaciones (son escrituras sin probar). Una cotización abierta con la vigencia pasada se marca "Vencida" aunque el backend siga diciendo draft o sent
import React from 'react'
import './QuotationsScreen.css'
import '@/global/components/UI/molecules/DataTable/DataTable.css'
import { formatCOP } from '@/global/helpers/format'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { Pagination } from '@/global/components/UI/molecules/Pagination'
import { StatCard } from '@/global/components/UI/molecules/StatCard'
import { TableMessageRow } from '@/global/components/UI/molecules/DataTable/TableMessageRow'
import { QUOTATION_FILTERS, QUOTATION_STATUS_LABELS } from '../constants/quotations.constants'
import { useQuotationsLoader } from '../hooks/useQuotationsLoader'
import { selectQuotations } from '../selectors/quotations.selectors'
import { setQuotationsFilter, setQuotationsPage } from '../slices/quotations.slice'
import { loadQuotationsThunk } from '../thunks/quotations.thunks'

const COLUMNS = 7

export const QuotationsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const { items, status, error, meta, statusFilter, stats } = useAppSelector(selectQuotations)
  useQuotationsLoader()

  const failed = stats.status === 'failed'
  const value = (n: number | undefined) => (failed ? 'No disponible' : n === undefined ? '…' : new Intl.NumberFormat('es-CO').format(n))
  const message = (() => {
    if (status === 'failed') return error
    if (items.length === 0 && (status === 'idle' || status === 'loading')) return 'Cargando cotizaciones…'
    if (items.length === 0) return statusFilter ? 'No hay cotizaciones con ese estado.' : 'No hay cotizaciones.'
    return null
  })()

  return (
    <div className="quotations-screen">
      <div className="quotations-kpis">
        <StatCard title="Cotizaciones" value={value(stats.data?.total)} subtitle={`Borradores: ${stats.data?.drafts ?? '…'} · Enviadas: ${stats.data?.sent ?? '…'}`} />
        <StatCard title="Aceptadas" value={value(stats.data?.accepted)} subtitle={`Convertidas en pedido: ${stats.data?.converted ?? '…'}`} />
        <StatCard title="Valor cotizado" value={failed ? 'No disponible' : formatCOP(stats.data?.totalValue ?? 0)} subtitle={`Conversión: ${stats.data?.conversionRate ?? 0} %`} />
      </div>

      <div className="data-table-card">
        <div className="quotations-filters" role="tablist" aria-label="Filtrar por estado">
          {QUOTATION_FILTERS.map((filter) => (
            <button key={filter.value} type="button" role="tab" aria-selected={filter.value === statusFilter} className={`quotations-filter ${filter.value === statusFilter ? 'quotations-filter-active' : ''}`} onClick={() => dispatch(setQuotationsFilter(filter.value))}>
              {filter.label}
            </button>
          ))}
        </div>
        <div className="data-table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cotización</th>
                <th>Creada</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th>Vigente hasta</th>
                <th className="data-table-number">Total</th>
              </tr>
            </thead>
            <tbody>
              {message ? (
                <TableMessageRow colSpan={COLUMNS} message={message} isError={status === 'failed'} onRetry={status === 'failed' ? () => dispatch(loadQuotationsThunk()) : undefined} />
              ) : (
                items.map((quotation) => (
                  <tr key={quotation.id}>
                    <td className="data-table-strong">
                      {quotation.number}
                      <div className="data-table-sub">{quotation.lines} {quotation.lines === 1 ? 'línea' : 'líneas'}</div>
                    </td>
                    <td>{quotation.createdAt || '—'}</td>
                    <td>{quotation.customerName}</td>
                    <td>{quotation.sellerName}</td>
                    <td>
                      <span className="quotations-status">{QUOTATION_STATUS_LABELS[quotation.status] ?? (quotation.status || '—')}</span>
                    </td>
                    <td>
                      {quotation.validUntil || '—'}
                      {quotation.expired && <span className="quotations-expired">Vencida</span>}
                    </td>
                    <td className="data-table-number">{formatCOP(quotation.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {meta && <Pagination meta={meta} disabled={status === 'loading'} label="Paginación de cotizaciones" onPageChange={(next) => dispatch(setQuotationsPage(next))} />}
    </div>
  )
}

export default QuotationsScreen
