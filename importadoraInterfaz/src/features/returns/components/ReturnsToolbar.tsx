// ReturnsToolbar · barra de la tabla de devoluciones: búsqueda, filtro de bodega, filtro de estado y botón para crear
// conecta con: ReturnsScreen; los valores y cambios vienen de useReturnsList
import React from 'react'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { selectWarehouses } from '@/features/warehouses'
import type { ReturnsCounts } from '../helpers/returns.helpers'
import type { ReturnStatusFilter } from '../types/returns.types'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

interface Props {
  query: string
  status: ReturnStatusFilter
  warehouseId: number | null
  counts: ReturnsCounts
  hasFilters: boolean
  onQuery: (value: string) => void
  onStatus: (value: ReturnStatusFilter) => void
  onWarehouse: (id: number | null) => void
  onClear: () => void
  onCreate: () => void
}

export const ReturnsToolbar: React.FC<Props> = ({ query, status, warehouseId, counts, hasFilters, onQuery, onStatus, onWarehouse, onClear, onCreate }) => {
  const warehouses = useAppSelector(selectWarehouses)
  return (
    <div className="data-toolbar returns-toolbar">
      <SearchBar
        value={query}
        onChange={onQuery}
        hasActiveFilters={hasFilters}
        onClear={onClear}
        placeholder="Buscar por factura (FAC-*), cliente o motivo..."
        className="returns-search"
      />
      <div className="returns-toolbar-middle">
        <label className="returns-toolbar-filter">
          <span>Bodega:</span>
          <select
            className="returns-toolbar-select"
            value={warehouseId ? String(warehouseId) : 'all'}
            onChange={(e) => onWarehouse(e.target.value === 'all' ? null : Number(e.target.value))}
          >
            <option value="all">Todas las bodegas</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={String(wh.id)}>{wh.name}</option>
            ))}
          </select>
        </label>
        <label className="returns-toolbar-filter">
          <span>Estado:</span>
          <select className="returns-toolbar-select" value={status} onChange={(e) => onStatus(e.target.value as ReturnStatusFilter)}>
            <option value="all">Todas ({counts.total})</option>
            <option value="pending">Pendientes ({counts.pending})</option>
            <option value="approved">Aprobadas ({counts.approved})</option>
            <option value="rejected">Rechazadas ({counts.rejected})</option>
          </select>
        </label>
      </div>
      <div className="returns-toolbar-actions">
        <button type="button" className="btn-primary" onClick={onCreate}><Icon svg={plusIcon} /> Crear Devolución</button>
      </div>
    </div>
  )
}
