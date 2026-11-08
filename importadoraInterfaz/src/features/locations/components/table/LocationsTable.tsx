// LocationsTable · tabla de ubicaciones de la bodega: código, descripción, productos, unidades, estado y acciones (ver, QR, editar, eliminar); el estado se cambia desde un desplegable en su columna
// conecta con: LocationsScreen (la usa), RowActions (acciones con íconos de línea), usePagedList + Pagination (20 por página), useLocationActions (activar y eliminar), ReasonPrompt y navigation (abrir panel de detalle, formulario y QR)
// ojo: el estilo de tabla es el de las demás tablas de inventario (InventoryTables.css); eliminar solo funciona con la ubicación vacía (la API lo exige)
import React, { useState } from 'react'
import '@/features/inventory/components/InventoryTables.css'
import { ReasonPrompt } from '@/features/reasonPrompt'
import { Pagination } from '@/global/components/UI/molecules/table/Pagination'
import { RowActions } from '@/global/components/UI/molecules/table/RowActions'
import { usePagedList } from '@/global/hooks/data/usePagedList'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { usePermissions } from '@/global/hooks/access/usePermissions'
import { openDrawerForm } from '@/features/navigation'
import eyeIcon from '@/assets/icons/eye.svg?raw'
import editIcon from '@/assets/icons/edit.svg?raw'
import trashIcon from '@/assets/icons/trash.svg?raw'
import qrIcon from '@/assets/icons/qr-code.svg?raw'
import { hasStock, locationLabel } from '../../helpers/locations.adapter'
import { useLocationActions } from '../../hooks/useLocationActions'
import type { WarehouseLocation } from '../../types/locations.types'
import { DataTable } from '@/global/components/UI/molecules/table/DataTable'

interface LocationsTableProps {
  locations: WarehouseLocation[]
  warehouseId: number
  warehouseName: string
  message: string | null // lo que se dice en lugar de las filas (cargando, error o nada que mostrar)
  resetKey: string // cambia cuando cambia la búsqueda: vuelve a la página 1
  onChanged: () => void // recarga la lista (cuando se reubica algo desde el detalle)
}

export const LocationsTable: React.FC<LocationsTableProps> = ({ locations, warehouseId, warehouseName, message, resetKey, onChanged }) => {
  const dispatch = useAppDispatch()
  const { canPerformAction } = usePermissions()
  const canUpdate = canPerformAction('inventory', 'locations', 'update')
  const canDelete = canPerformAction('inventory', 'locations', 'delete')
  const actions = useLocationActions(warehouseId)
  const { pageItems, meta, setPage } = usePagedList(locations, resetKey)
  const [toDelete, setToDelete] = useState<WarehouseLocation | null>(null)
  const [toDeactivate, setToDeactivate] = useState<WarehouseLocation | null>(null)

  const confirmDelete = async (reason: string) => {
    const target = toDelete
    setToDelete(null)
    if (target) await actions.remove(target.id, reason)
  }

  const confirmDeactivate = async (reason: string) => {
    const target = toDeactivate
    setToDeactivate(null)
    if (target) await actions.toggle(target.id, false, reason)
  }

  // desactivar una ubicación siempre pide el motivo; activarla es directo
  const changeStatus = (location: WarehouseLocation, active: boolean) => {
    if (!active) setToDeactivate(location)
    else actions.toggle(location.id, active)
  }

  return (
    <>
      <DataTable tableId="locations-locations" className="inv-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th className="inv-num">Productos</th>
              <th className="inv-num">Unidades</th>
              <th>Estado</th>
              <th className="inv-actions-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {message ? (
              <tr>
                <td colSpan={6} className="inv-message">
                  <p>{message}</p>
                </td>
              </tr>
            ) : (
              pageItems.map((location) => (
                <tr key={location.id} className={location.isActive ? '' : 'inv-row-inactive'}>
                  <td>
                    <span className="inv-code">{location.code}</span>
                  </td>
                  <td className="inv-name">{location.description || '—'}</td>
                  <td className="inv-num">{location.productCount}</td>
                  <td className="inv-num">
                    <b>{location.units}</b>
                  </td>
                  <td>
                    <select
                      className={`inv-status-select is-${location.isActive ? 'active' : 'inactive'}`}
                      value={location.isActive ? 'active' : 'inactive'}
                      disabled={!canUpdate}
                      aria-label={`Estado de ${location.code}`}
                      title={canUpdate ? 'Cambiar estado' : 'No tienes permiso para cambiar el estado'}
                      onChange={(event) => changeStatus(location, event.target.value === 'active')}
                    >
                      <option value="active">Activa</option>
                      <option value="inactive">Inactiva</option>
                    </select>
                  </td>
                  <td>
                    <RowActions
                      actions={[
                        {
                          key: 'detail',
                          label: 'Ver productos de la ubicación',
                          icon: eyeIcon,
                          onClick: () => dispatch(openDrawerForm({ kind: 'locationDetail', payload: { location, warehouseName, onChanged } })),
                        },
                        {
                          key: 'qr',
                          label: 'Imprimir QR de la ubicación',
                          icon: qrIcon,
                          onClick: () => dispatch(openDrawerForm({ kind: 'qrLabels', payload: { heading: `Etiqueta de ${location.code}`, labels: [locationLabel(location, warehouseName)] } })),
                        },
                        {
                          key: 'edit',
                          label: 'Editar ubicación',
                          icon: editIcon,
                          visible: canUpdate,
                          onClick: () => dispatch(openDrawerForm({ kind: 'locationForm', payload: { warehouseId, warehouseName, location } })),
                        },
                        { key: 'delete', label: 'Eliminar ubicación (solo si está vacía)', icon: trashIcon, tone: 'danger', visible: canDelete, onClick: () => setToDelete(location) },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      <Pagination meta={meta} label="Paginación de ubicaciones" onPageChange={setPage} />

      <ReasonPrompt
        open={toDeactivate !== null}
        title="Desactivar ubicación"
        message={toDeactivate && hasStock(toDeactivate) ? `${toDeactivate.code} guarda ${toDeactivate.productCount ?? 0} producto(s) y ${toDeactivate.units ?? 0} unidad(es). Si la desactivas, las existencias siguen ahí pero no se podrá elegir esa ubicación para nuevos productos. ¿Desactivar?` : `¿Desactivar la ubicación ${toDeactivate?.code ?? ''}?`}
        confirmLabel="Desactivar"
        onConfirm={confirmDeactivate}
        onCancel={() => setToDeactivate(null)}
      />

      <ReasonPrompt
        open={toDelete !== null}
        title="Eliminar ubicación"
        message={`¿Eliminar la ubicación ${toDelete?.code ?? ''}? Solo se puede si no tiene productos guardados.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}

export default LocationsTable
