// useWarehouseActions · activar o desactivar una bodega y abrir sus ubicaciones, con su aviso de éxito o error
// conecta con: WarehousesTable (lo usa), warehouses.thunks, navigation (bodega activa y pantalla de ubicaciones) y toast
// ojo: «ver ubicaciones» deja esa bodega como la activa y abre Inventario > Ubicaciones; setActiveModule primero porque reinicia el subitem
import { setActiveModule, setActiveSubitem, setActiveWarehouse } from '@/features/navigation'
import { toast } from '@/global/helpers/feedback/toast'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectWarehousesSaving } from '../selectors/warehouses.selectors'
import { setWarehouseActiveThunk } from '../thunks/warehouses.thunks'
import type { Warehouse } from '../types/warehouse.types'

export const useWarehouseActions = () => {
    const dispatch = useAppDispatch()
    const saving = useAppSelector(selectWarehousesSaving)

    // devuelve true si salió bien; el error ya se avisó
    const setActive = async (warehouse: Warehouse, isActive: boolean, reason?: string): Promise<boolean> => {
        try {
            await dispatch(setWarehouseActiveThunk({ id: warehouse.id, isActive, reason })).unwrap()
            toast.success(`Bodega ${warehouse.name} ${isActive ? 'reactivada' : 'desactivada'}`)
            return true
        } catch (message) {
            toast.error(typeof message === 'string' ? message : 'No se pudo cambiar el estado de la bodega.')
            return false
        }
    }

    const openLocations = (warehouse: Warehouse) => {
        dispatch(setActiveWarehouse({ id: warehouse.id, name: warehouse.name }))
        dispatch(setActiveModule('inventory'))
        dispatch(setActiveSubitem('locations'))
    }

    return { saving, setActive, openLocations }
}
