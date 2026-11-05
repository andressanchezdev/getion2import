// useLocationsManagement · acciones de la gestión de ubicaciones de una bodega: clonar, reubicar, activar o desactivar y eliminar con confirmación
// conecta con: WarehouseLocationsManagement; usa useLocationActions y locations.thunks (crear) y abre drawers con navigation (openDrawerForm)
// ojo: desactivar una ubicación con existencias y eliminar piden confirmación; el motivo de eliminación se exige al usuario pero el backend aún no lo recibe
import { useState } from 'react'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch } from '@/global/hooks/store/useRedux'
import { openDrawerForm } from '@/features/navigation'
import { hasStock, useLocationActions, createLocationThunk, type WarehouseLocation } from '@/features/locations'

export const useLocationsManagement = (warehouseId: number, warehouseName: string, locations: WarehouseLocation[], reload: () => void) => {
  const dispatch = useAppDispatch()
  const actions = useLocationActions(warehouseId)
  const [toDelete, setToDelete] = useState<WarehouseLocation | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [toDeactivate, setToDeactivate] = useState<WarehouseLocation | null>(null)

  // crea una ubicación vacía con el código «-COPIA» (y un número si ya existe)
  const clone = async (location: WarehouseLocation) => {
    let copyCode = `${location.code}-COPIA`
    for (let n = 2; locations.some((l) => l.code.toUpperCase() === copyCode.toUpperCase()); n++) copyCode = `${location.code}-COPIA-${n}`
    try {
      await dispatch(
        createLocationThunk({ warehouseId, input: { code: copyCode, description: location.description ? `${location.description} (Copia)` : '' } })
      ).unwrap()
      toast.success(`Ubicación clonada exitosamente como ${copyCode} (vacía)`)
      reload()
    } catch {
      toast.error('No se pudo clonar la ubicación.')
    }
  }

  const openDetail = (location: WarehouseLocation) =>
    dispatch(openDrawerForm({ kind: 'locationDetail', payload: { location, warehouseName, onChanged: reload } }))

  const relocate = (location: WarehouseLocation) => {
    if (location.units <= 0 && location.productCount <= 0) return toast.info('Esta ubicación está desocupada / libre. No tiene productos para reubicar.')
    openDetail(location)
  }

  const changeStatus = async (location: WarehouseLocation, active: boolean) => {
    if (!active && hasStock(location)) return setToDeactivate(location)
    if (await actions.toggle(location.id, active)) reload()
  }

  const confirmDeactivate = async () => {
    const target = toDeactivate
    setToDeactivate(null)
    if (target && (await actions.toggle(target.id, false))) reload()
  }

  const cancelDelete = () => {
    setToDelete(null)
    setDeleteReason('')
  }

  const confirmDelete = async () => {
    const target = toDelete
    cancelDelete()
    if (target && (await actions.remove(target.id))) reload()
  }

  return {
    clone, openDetail, relocate, changeStatus,
    toDeactivate, cancelDeactivate: () => setToDeactivate(null), confirmDeactivate,
    toDelete, requestDelete: setToDelete, deleteReason, setDeleteReason, cancelDelete, confirmDelete,
  }
}
