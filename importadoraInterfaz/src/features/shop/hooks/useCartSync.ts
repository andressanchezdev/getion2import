// useCartSync · lee el carrito del backend al entrar (y al cambiar de bodega) y lo limpia de la memoria al salir de la sesión
// conecta con: ErpLayout (lo monta mientras haya sesión), shop.cart.thunks (fetchCartThunk), shop.cart.slice (resetCart), navigation (bodega activa) y warehouses (estado de carga)
// ojo: la API tiene un carrito activo por empleado y lo crea sola, así que siempre se lee (el superadmin no tiene compañía ni carrito: no se lee)
// ojo: igual que el catálogo, espera a que haya bodega activa (el carrito se lee por bodega), salvo que las bodegas hayan fallado
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { selectCurrentUser } from '@/features/auth'
import { selectWarehousesStatus } from '@/features/warehouses'
import { resetCart } from '../slices/shop.cart.slice'
import { fetchCartThunk } from '../thunks/shop.cart.thunks'

export const useCartSync = (): void => {
    const dispatch = useAppDispatch()
    const user = useAppSelector(selectCurrentUser)
    const companyId = user?.companyId
    const activeWarehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
    const warehousesStatus = useAppSelector(selectWarehousesStatus)

    const ready = activeWarehouseId !== '' || warehousesStatus === 'failed'

    // el carrito se lee al entrar y al elegir otra bodega (sin efecto visible)
    useEffect(() => {
        if (companyId && ready) dispatch(fetchCartThunk())
    }, [dispatch, companyId, activeWarehouseId, ready])

    // al salir (cerrar sesión) se olvida el carrito de este usuario
    useEffect(() => {
        return () => {
            dispatch(resetCart())
        }
    }, [dispatch])
}
