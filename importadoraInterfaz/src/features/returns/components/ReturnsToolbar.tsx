// ReturnsToolbar · barra de la tabla de devoluciones: búsqueda, filtro de bodega, filtro de estado y botón para crear
// conecta con: ReturnsScreen; los valores y cambios vienen de useReturnsList
import React from 'react'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
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
  onCreate?: () => void // sin permiso returns:create no se pasa y el botón no aparece
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
        <FilterSelect
          label="Bodega"
          allLabel="Todas las bodegas"
          emptyValue="all"
          value={warehouseId ? String(warehouseId) : 'all'}
          options={warehouses.map((wh) => ({ value: String(wh.id), label: wh.name }))}
          onChange={(val) => onWarehouse(val === 'all' ? null : Number(val))}
        />
        <FilterSelect
          label="Estado"
          allLabel={`Todas (${counts.total})`}
          emptyValue="all"
          value={status}
          options={[
            { value: 'all', label: `Todas (${counts.total})` },
            { value: 'pending', label: `Pendientes (${counts.pending})` },
            { value: 'approved', label: `Aprobadas (${counts.approved})` },
            { value: 'rejected', label: `Rechazadas (${counts.rejected})` },
          ]}
          onChange={(val) => onStatus(val as ReturnStatusFilter)}
        />
      </div>
      <div className="returns-toolbar-actions">
        {onCreate && <button type="button" className="btn-primary" onClick={onCreate}><Icon svg={plusIcon} /> Crear Devolución</button>}
      </div>
    </div>
  )
}
