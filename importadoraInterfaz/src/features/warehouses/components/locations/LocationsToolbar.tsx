// LocationsToolbar · barra de la gestión de ubicaciones: búsqueda, selector de bodega, conteo, imprimir QR y nueva ubicación
// conecta con: WarehouseLocationsManagement; abre los drawers qrLabels y locationForm con navigation (openDrawerForm)
import React from 'react'
import { FilterSelect } from '@/global/components/UI/molecules/filters/FilterSelect'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { locationLabel, type WarehouseLocation } from '@/features/locations'
import type { Warehouse } from '../../types/warehouse.types'

interface Props {
  query: string
  onQuery: (value: string) => void
  warehouses: Warehouse[]
  warehouseId: number
  warehouseName: string
  onSelectWarehouse: (id: number) => void
  total: number
  visible: WarehouseLocation[]
  canCreate: boolean
}

export const LocationsToolbar: React.FC<Props> = ({ query, onQuery, warehouses, warehouseId, warehouseName, onSelectWarehouse, total, visible, canCreate }) => {
  const dispatch = useAppDispatch()
  const options = warehouses.map((wh) => ({ value: String(wh.id), label: `${wh.name} (${wh.code || 'B-' + wh.id})` }))
  const printQr = () =>
    dispatch(
      openDrawerForm({
        kind: 'qrLabels',
        payload: { heading: `Etiquetas QR de ${warehouseName}`, labels: visible.filter((l) => l.isActive).map((l) => locationLabel(l, warehouseName)) },
      })
    )
  return (
    <div className="wh-toolbar">
      <SearchBar value={query} onChange={onQuery} hasActiveFilters={Boolean(query)} onClear={() => onQuery('')} placeholder="Buscar ubicación por código o pasillo..." className="wh-search" />
      <FilterSelect label="Sede / Bodega" emptyValue="" value={String(warehouseId)} options={options} onChange={(val) => val && onSelectWarehouse(Number(val))} />
      <span className="wh-count" aria-live="polite">{total} ubicaciones en {warehouseName}</span>
      <button type="button" className="btn-secondary" disabled={visible.length === 0} onClick={printQr}>Imprimir QR</button>
      {canCreate && (
        <button type="button" className="btn-primary" onClick={() => dispatch(openDrawerForm({ kind: 'locationForm', payload: { warehouseId, warehouseName } }))}>
          + Nueva ubicación
        </button>
      )}
    </div>
  )
}
