// useWarehouses · pide las bodegas la primera vez y devuelve la lista y su estado de carga
// conecta con: WarehouseSelector y WarehouseMenu (los usan); despacha warehouses.thunks y lee warehouses.selectors
// ojo: solo pide cuando está en "idle"; si falla NO se reintenta solo (evita un bucle con el servidor caído)
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectWarehouses, selectWarehousesStatus } from '../selectors/warehouses.selectors'
import { fetchWarehousesThunk } from '../thunks/warehouses.thunks'

export const useWarehouses = () => {
    const dispatch = useAppDispatch()
    const warehouses = useAppSelector(selectWarehouses)
    const status = useAppSelector(selectWarehousesStatus)

    useEffect(() => {
        if (status === 'idle') dispatch(fetchWarehousesThunk())
    }, [dispatch, status])

    return { warehouses, status }
}
