// AbonosTable · una sola tarjeta con búsqueda, filtros (bodega, método y estado), total recaudado, botón de crear y la tabla de abonos y recaudos
// conecta con: WalletScreen (la usa), usePaymentsHistory (datos), wallet.abonos (filtrar y sumar), RowActions (ver detalle), Pill (método y estado), Pagination y navigation (abre «createAbono» y «abonoDetail»)
// ojo: el estado se cambia desde un desplegable (en revisión, verificado o rechazado); rechazar pide motivo en el panel derecho; verificado y anulado ya no se cambian
// ojo: la bodega ya no es columna: se filtra desde la barra y se ve en el detalle del abono; un abono por transferencia queda «En revisión» hasta conciliarlo con el banco
import React, { useMemo, useState } from 'react'
import './AbonosTable.css'
import { Pill, type PillTone } from '@/global/components/UI/atoms/Pill'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { formatCOP } from '@/global/helpers/formatting/format'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import { ABONO_METHOD_OPTIONS, ABONO_STATUS_OPTIONS, INITIAL_ABONO_FILTERS } from '../../constants/wallet.constants'
import { filterAbonos, hasAbonoFilters, totalAbonos } from '../../helpers/wallet.abonos'
import { usePaymentsHistory } from '../../hooks/usePaymentsHistory'
import { rejectPaymentThunk, reopenPaymentThunk, verifyPaymentThunk } from '../../thunks/wallet.payments.thunks'
import type { AbonoFilters, AbonoRecord } from '../../types/wallet.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'
import { ActionsHeader } from '@/global/components/UI/molecules/table/ActionsHeader'
import { CopyableCell } from '@/global/components/UI/molecules/table/CopyableCell'
import { StatusSelect } from '@/global/components/UI/molecules/table/StatusSelect'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

const STATUS: Record<AbonoRecord['status'], { label: string; tone: PillTone }> = {
  verified: { label: 'Verificado', tone: 'green' },
  pending: { label: 'En revisión', tone: 'amber' },
  rejected: { label: 'Rechazado', tone: 'red' },
  void: { label: 'Anulado', tone: 'gray' },
}

export const AbonosTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const { items: payments, status, reload } = usePaymentsHistory()
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const [filters, setFilters] = useState<AbonoFilters>(INITIAL_ABONO_FILTERS)
  const [toReject, setToReject] = useState<AbonoRecord | null>(null)
  const { can } = usePermissions()
  const canEditStatus = can('payments:verify')
  const canCreate = can('payments:create')

  // a qué estados puede pasar un abono: en revisión → verificado o rechazado; rechazado → de nuevo en revisión; lo demás no cambia
  const statusChoices = (abono: AbonoRecord): AbonoRecord['status'][] | null => (abono.status === 'pending' ? ['pending', 'verified', 'rejected'] : abono.status === 'rejected' ? ['rejected', 'pending'] : null)
  const changeStatus = (abono: AbonoRecord, next: AbonoRecord['status']) => {
    if (next === 'verified') void dispatch(verifyPaymentThunk({ paymentId: Number(abono.id) }))
    if (next === 'rejected') setToReject(abono)
    if (next === 'pending') void dispatch(reopenPaymentThunk({ paymentId: Number(abono.id) }))
  }

  const loading = status === 'idle' || status === 'loading'
  const setFilter = (key: keyof AbonoFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }))

  const warehouseOptions = useMemo(() => warehouses.map((w) => ({ value: w.code || String(w.id), label: `${w.code || `B-${w.id}`} · ${w.name}` })), [warehouses])
  const filtered = useMemo(() => filterAbonos(payments, filters), [payments, filters])
  const { pageItems, meta, setPage } = usePagedList(filtered, filtered)
  const hasFilters = hasAbonoFilters(filters)

  const message = loading ? 'Cargando historial de abonos y recaudos…' : pageItems.length === 0 ? 'No hay abonos ni recaudos que coincidan con la búsqueda.' : null

  return (
    <div className="data-card">
      <div className="data-toolbar">
        <SearchBar
          value={filters.query}
          onChange={(value) => setFilter('query', value)}
          hasActiveFilters={hasFilters}
          onClear={() => setFilters(INITIAL_ABONO_FILTERS)}
          placeholder="Buscar por recibo, cliente, NIT, pedido o referencia…"
          className="abonos-search"
        />
        <FilterSelect label="Bodega" allLabel="Todas las bodegas" emptyValue="all" value={filters.warehouse || 'all'} options={warehouseOptions} onChange={(value) => setFilter('warehouse', value || 'all')} />
        <FilterSelect label="Método" emptyValue="all" value={filters.method} options={ABONO_METHOD_OPTIONS} onChange={(value) => setFilter('method', value || 'all')} />
        <FilterSelect label="Estado" emptyValue="all" value={filters.status} options={ABONO_STATUS_OPTIONS} onChange={(value) => setFilter('status', value || 'all')} />
        <span className="abonos-total" title="Total recaudado con los filtros aplicados">
          Total: <strong>{formatCOP(totalAbonos(filtered))}</strong>
        </span>
        {canCreate && (
          <button type="button" className="btn-primary abonos-create" onClick={() => dispatch(openDrawerForm({ kind: 'createAbono', payload: { onDone: reload } }))}>
            <Icon svg={plusIcon} /> Crear abono
          </button>
        )}
      </div>

      <DataTable tableId="wallet-abonos">
        <thead>
          <tr>
            <th className="col-priority-high">Recibo</th>
            <th className="col-priority-medium">Fecha</th>
            <th className="col-priority-high">Cliente</th>
            <th className="col-priority-low">Identificación</th>
            <th className="col-priority-medium">Doc. / Venta</th>
            <th className="col-priority-high">Método</th>
            <th className="col-priority-low">Referencia</th>
            <th className="abonos-num col-priority-high">Monto</th>
            <th className="col-priority-high">Estado</th>
            <ActionsHeader className="col-actions" />
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
                <td className="col-priority-high"><CopyableCell text={abono.serialCode} /></td>
                <td className="col-priority-medium">{abono.date}</td>
                <td className="col-priority-high">{abono.customerName}</td>
                <td className="col-priority-low">{abono.customerDoc ? <CopyableCell text={abono.customerDoc} /> : '—'}</td>
                <td className="col-priority-medium">{abono.saleSerial ? <CopyableCell text={abono.saleSerial} /> : '—'}</td>
                <td className="col-priority-high"><Pill tone={abono.method === 'cash' ? 'green' : 'blue'}>{abono.method === 'cash' ? 'Efectivo' : 'Transferencia'}</Pill></td>
                <td className="col-priority-low">{abono.reference ? <CopyableCell text={abono.reference} /> : '—'}</td>
                <td className="abonos-num table-amount col-priority-high">{formatCOP(abono.amount)}</td>
                <td className="col-priority-high">
                  {canEditStatus && statusChoices(abono) ? (
                    <StatusSelect
                      value={abono.status}
                      options={statusChoices(abono)?.map((status) => ({ value: status, label: STATUS[status].label })) ?? []}
                      ariaLabel={`Estado del recibo ${abono.serialCode}`}
                      onChange={(val) => changeStatus(abono, val as AbonoRecord['status'])}
                    />
                  ) : (
                    <Pill tone={STATUS[abono.status].tone}>{STATUS[abono.status].label}</Pill>
                  )}
                </td>
                <td className="col-actions">
                  <RowActions actions={[{ key: 'detail', label: `Ver detalle del recibo ${abono.serialCode}`, icon: eyeIcon, onClick: () => dispatch(openDrawerForm({ kind: 'abonoDetail', payload: abono })) }]} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
      <Pagination meta={meta} label="Paginación de abonos" onPageChange={setPage} />
      <ReasonPrompt
        open={toReject !== null}
        title="Rechazar abono"
        message={`¿Rechazar el recibo ${toReject?.serialCode ?? ''}? Queda marcado con novedad y no cuenta como pago hasta que se reabra o se anule.`}
        confirmLabel="Rechazar"
        onConfirm={(reason) => {
          const target = toReject
          setToReject(null)
          if (target) void dispatch(rejectPaymentThunk({ paymentId: Number(target.id), reason }))
        }}
        onCancel={() => setToReject(null)}
      />
    </div>
  )
}

export default AbonosTable
