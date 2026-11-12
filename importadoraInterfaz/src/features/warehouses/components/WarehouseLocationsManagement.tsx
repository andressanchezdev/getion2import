// WarehouseLocationsManagement · gestión de las ubicaciones de una bodega: búsqueda, ocupación, estado y acciones (ver, editar, reubicar, clonar, eliminar)
// conecta con: WarehousesScreen (la monta), useWarehouseLocations (carga), useLocationsManagement (acciones) y las piezas de components/locations
// ojo: el selector de bodega de la barra cambia la bodega de la pantalla (onSelectWarehouse); la tabla es paginada en memoria
import React, { useMemo, useState } from 'react'
import '@/features/inventory/components/InventoryTables.css'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { filterLocations } from '@/features/locations'
import { useLocationsManagement } from '../hooks/useLocationsManagement'
import { useWarehouseLocations } from '../hooks/useWarehouseLocations'
import type { Warehouse } from '../types/warehouse.types'
import { LocationDialogs } from './locations/LocationDialogs'
import { LocationRow } from './locations/LocationRow'
import { LocationsToolbar } from './locations/LocationsToolbar'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

interface Props {
  warehouses: Warehouse[]
  selectedWarehouseId: number
  onSelectWarehouse: (id: number) => void
}

export const WarehouseLocationsManagement: React.FC<Props> = ({ warehouses, selectedWarehouseId, onSelectWarehouse }) => {
  const { can } = usePermissions()
  const canCreate = can('stock:edit')
  const canUpdate = can('stock:edit')
  const canDelete = can('stock:edit')
  const [query, setQuery] = useState('')

  const active = warehouses.find((w) => Number(w.id) === selectedWarehouseId) ?? warehouses[0]
  const warehouseId = active ? Number(active.id) : selectedWarehouseId
  const warehouseName = active ? active.name : `Bodega #${warehouseId}`

  const { locations, loading, reload } = useWarehouseLocations(warehouseId)
  const manage = useLocationsManagement(warehouseId, warehouseName, locations, reload)
  const visible = useMemo(() => filterLocations(locations, query), [locations, query])
  const { pageItems, meta, setPage } = usePagedList(visible, `${warehouseId}|${query}`)

  const message = loading
    ? 'Cargando ubicaciones…'
    : locations.length === 0
    ? 'Esta bodega todavía no tiene ubicaciones registradas.'
    : visible.length === 0
    ? 'No hay ubicaciones que coincidan con la búsqueda.'
    : null

  return (
    <div className="data-card">
      <LocationsToolbar
        query={query} onQuery={setQuery} warehouses={warehouses} warehouseId={warehouseId} warehouseName={warehouseName}
        onSelectWarehouse={onSelectWarehouse} total={locations.length} visible={visible} canCreate={canCreate}
      />
      <DataTable tableId="warehouses-warehouse-locations-management">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción / Pasillo</th>
              <th className="wh-num">Items almacenados</th>
              <th>Ocupación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr><td colSpan={6} className="wh-empty">{message}</td></tr>
            ) : (
              pageItems.map((location) => (
                <LocationRow
                  key={location.id} location={location} warehouseId={warehouseId} warehouseName={warehouseName}
                  canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete}
                  onDetail={manage.openDetail} onRelocate={manage.relocate} onClone={manage.clone}
                  onDelete={manage.requestDelete} onStatus={manage.changeStatus}
                />
              ))
            )}
          </tbody>
        </DataTable>
      <Pagination meta={meta} label="Paginación de ubicaciones" onPageChange={setPage} />
      <LocationDialogs
        toDeactivate={manage.toDeactivate} onConfirmDeactivate={manage.confirmDeactivate} onCancelDeactivate={manage.cancelDeactivate}
        toDelete={manage.toDelete}
        onConfirmDelete={manage.confirmDelete} onCancelDelete={manage.cancelDelete}
      />
    </div>
  )
}

export default WarehouseLocationsManagement
