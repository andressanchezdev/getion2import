// useCartSync · lee el carrito del backend al entrar (y al cambiar de bodega) y lo limpia de la memoria al salir de la sesión
// conecta con: ErpLayout (lo monta mientras haya sesión), shop.cart.thunks (fetchCartThunk), shop.cart.slice (resetCart), navigation (bodega activa) y warehouses (estado de carga)
// ojo: si todavía no hay uuid (nadie ha agregado nada) no se llama al backend: el carrito está vacío
// ojo: igual que el catálogo, espera a que haya bodega activa (el carrito se lee por bodega), salvo que las bodegas hayan fallado
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
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
    const cartUuid = useAppSelector((state) => state.shop.cartUuid)

    const ready = activeWarehouseId !== '' || warehousesStatus === 'failed'

    // el carrito depende de la bodega: al elegir otra se vuelve a leer (también se lee al crearse el uuid con el primer producto; es una lectura de más, sin efecto visible)
    useEffect(() => {
        if (companyId && cartUuid && ready) dispatch(fetchCartThunk())
    }, [dispatch, companyId, activeWarehouseId, cartUuid, ready])

    // al salir (cerrar sesión) se olvida el carrito de este usuario
    useEffect(() => {
        return () => {
            dispatch(resetCart())
        }
    }, [dispatch])
}
