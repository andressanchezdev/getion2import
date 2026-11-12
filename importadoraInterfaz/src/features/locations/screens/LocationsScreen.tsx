// LocationsScreen · Inventario > Ubicaciones: los estantes de la bodega activa con lo que guarda cada uno; crear, editar, ver contenido e imprimir QR
// conecta con: useLocations (las pide), filterLocations (búsqueda), LocationsTable, global SearchBar y navigation (abrir el formulario y las etiquetas); la monta MainContent (screenRegistry)
// ojo: la pantalla no llama a la API; las ubicaciones son por bodega, así que al cambiar la bodega activa se recargan
import React, { useMemo, useState } from 'react'
import '@/features/inventory/components/InventoryTables.css'
import './LocationsScreen.css'
import { SearchBar } from '@/global/components/UI/molecules/filters/SearchBar'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { openDrawerForm } from '@/features/navigation'
import { LocationsTable } from '../components/table/LocationsTable'
import { filterLocations, locationLabel } from '../helpers/locations.adapter'
import { useLocations } from '../hooks/useLocations'
import { Icon } from '@/global/components/UI/atoms/Icon'
import plusIcon from '@/assets/icons/plus.svg?raw'

export const LocationsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const canCreate = usePermissions().can('stock:edit')
  const { warehouseId, warehouseName, items, status, error, reload } = useLocations()
  const [query, setQuery] = useState('')

  const visible = useMemo(() => filterLocations(items, query), [items, query])
  const message = status === 'failed' ? error : warehouseId <= 0 ? 'Elige una bodega para ver sus ubicaciones.' : visible.length === 0 ? (status === 'succeeded' ? 'No se encontraron ubicaciones.' : 'Cargando ubicaciones…') : null

  return (
    <div className="inv-screen">
      {/* <nav className="loc-breadcrumb" aria-label="Ruta">
        <span>Inventario</span>
        <span aria-hidden="true">›</span>
        <span>{warehouseName || 'Sin bodega'}</span>
        <span aria-hidden="true">›</span>
        <strong aria-current="page">Ubicaciones</strong>
      </nav> */}
      <div className="data-card">
        <div className="data-toolbar inv-toolbar">
          <SearchBar
            value={query}
            onChange={setQuery}
            hasActiveFilters={Boolean(query)}
            onClear={() => setQuery('')}
            placeholder="Buscar ubicación por código o descripción..."
            className="inv-search"
          />
          <div className="inv-toolbar-actions">
            <span className="inv-count">{items.length} ubicaciones</span>
            <button
              type="button"
              className="btn-secondary"
              disabled={visible.length === 0}
              onClick={() => dispatch(openDrawerForm({ kind: 'qrLabels', payload: { heading: 'Etiquetas de ubicaciones', labels: visible.filter((location) => location.isActive).map((location) => locationLabel(location, warehouseName)) } }))}
            >
              Imprimir QR
            </button>
            {canCreate && (
              <button type="button" className="btn-primary" onClick={() => dispatch(openDrawerForm({ kind: 'locationForm', payload: { warehouseId, warehouseName } }))}>
                <Icon svg={plusIcon} /> Nueva ubicación
              </button>
            )}
          </div>
        </div>
        <LocationsTable locations={visible} warehouseId={warehouseId} warehouseName={warehouseName} message={message} resetKey={query} onChanged={reload} />
      </div>
    </div>
  )
}

export default LocationsScreen
