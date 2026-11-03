// AbonosTable · una sola tarjeta con búsqueda, filtros (bodega, método y estado), total recaudado, botón de crear y la tabla de abonos y recaudos
// conecta con: WalletScreen (la usa), usePaymentsHistory (datos), wallet.abonos (filtrar y sumar), RowActions (ver detalle), Pill (método y estado), Pagination y navigation (abre «createAbono» y «abonoDetail»)
// ojo: la bodega ya no es columna: se filtra desde la barra y se ve en el detalle del abono; un abono por transferencia queda «En revisión» hasta conciliarlo con el banco
import React, { useMemo, useState } from 'react'
import './AbonosTable.css'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { formatCOP } from '@/global/helpers/formatting/format'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import { ABONO_METHOD_OPTIONS, ABONO_STATUS_OPTIONS, INITIAL_ABONO_FILTERS } from '../../constants/wallet.constants'
import { filterAbonos, hasAbonoFilters, totalAbonos } from '../../helpers/wallet.abonos'
import { usePaymentsHistory } from '../../hooks/usePaymentsHistory'
import type { AbonoFilters, AbonoRecord } from '../../types/wallet.types'

const STATUS: Record<AbonoRecord['status'], { label: string; tone: PillTone }> = {
  verified: { label: 'Verificado', tone: 'green' },
  pending: { label: 'En revisión', tone: 'amber' },
  void: { label: 'Anulado', tone: 'gray' },
}

export const AbonosTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const { items: payments, status, reload } = usePaymentsHistory()
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const [filters, setFilters] = useState<AbonoFilters>(INITIAL_ABONO_FILTERS)

  const loading = status === 'idle' || status === 'loading'
  const setFilter = (key: keyof AbonoFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }))

  const warehouseOptions = useMemo(() => warehouses.map((w) => ({ value: w.code || String(w.id), label: `${w.code || `B-${w.id}`} · ${w.name}` })), [warehouses])
  const filtered = useMemo(() => filterAbonos(payments, filters), [payments, filters])
  const { pageItems, meta, setPage } = usePagedList(filtered, filtered)
  const hasFilters = hasAbonoFilters(filters)

  const message = loading ? 'Cargando historial de abonos y recaudos…' : pageItems.length === 0 ? 'No hay abonos ni recaudos que coincidan con la búsqueda.' : null

  return (
    <div className="abonos-card">
      <div className="abonos-toolbar">
        <SearchBar
          value={filters.query}
          onChange={(value) => setFilter('query', value)}
          hasActiveFilters={hasFilters}
          onClear={() => setFilters(INITIAL_ABONO_FILTERS)}
          placeholder="Buscar por recibo, cliente, NIT, pedido o referencia…"
          className="abonos-search"
        />
        <FilterSelect label="Bodega" emptyValue="all" value={filters.warehouse || 'all'} options={warehouseOptions} onChange={(value) => setFilter('warehouse', value || 'all')} />
        <FilterSelect label="Método" emptyValue="all" value={filters.method} options={ABONO_METHOD_OPTIONS} onChange={(value) => setFilter('method', value || 'all')} />
        <FilterSelect label="Estado" emptyValue="all" value={filters.status} options={ABONO_STATUS_OPTIONS} onChange={(value) => setFilter('status', value || 'all')} />
        <span className="abonos-total" title="Total recaudado con los filtros aplicados">
          Total: <strong>{formatCOP(totalAbonos(filtered))}</strong>
        </span>
        <button type="button" className="btn-primary abonos-create" onClick={() => dispatch(openDrawerForm({ kind: 'createAbono', payload: { onDone: reload } }))}>
          + Crear abono
        </button>
      </div>

      <div className="abonos-table-responsive table-scroll">
        <table className="abonos-table">
          <thead>
            <tr>
              <th>Recibo</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Identificación</th>
              <th>Doc. / Venta</th>
              <th>Método</th>
              <th>Referencia</th>
              <th className="abonos-num">Monto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={10} className="abonos-empty">{message}</td>
              </tr>
            ) : (
              pageItems.map((abono) => (
                <tr key={abono.id}>
                  <td><strong>{abono.serialCode}</strong></td>
                  <td>{abono.date}</td>
                  <td>{abono.customerName}</td>
                  <td>{abono.customerDoc}</td>
                  <td>{abono.saleSerial || '—'}</td>
                  <td><Pill tone={abono.method === 'cash' ? 'green' : 'blue'}>{abono.method === 'cash' ? 'Efectivo' : 'Transferencia'}</Pill></td>
                  <td>{abono.reference || '—'}</td>
                  <td className="abonos-num table-amount">{formatCOP(abono.amount)}</td>
                  <td><Pill tone={STATUS[abono.status].tone}>{STATUS[abono.status].label}</Pill></td>
                  <td>
                    <RowActions actions={[{ key: 'detail', label: `Ver detalle del recibo ${abono.serialCode}`, icon: eyeIcon, onClick: () => dispatch(openDrawerForm({ kind: 'abonoDetail', payload: abono })) }]} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} label="Paginación de abonos" onPageChange={setPage} />
    </div>
  )
}

export default AbonosTable
