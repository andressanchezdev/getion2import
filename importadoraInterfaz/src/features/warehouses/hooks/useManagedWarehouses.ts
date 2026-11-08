// useManagedWarehouses — pide todas las bodegas (con inactivas y totales) y maneja la búsqueda, el filtro de estado y la marca de la bodega recién tocada
// conecta con: WarehousesScreen y WarehousesTable (lo usan), warehouses.thunks, warehouses.selectors, warehouses.manage (filtrar) y auth (hay sesión)
// ojo: la marca 'Nueva / Actualizada' se quita sola a los pocos segundos; si la carga falla no se reintenta sola
// ojo: si la lista llega vacía se reintenta una sola vez (no en bucle): una compañía nueva sin bodegas debe quedar en «Todavía no hay bodegas»
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { RECENT_BADGE_MS } from '../constants/warehouses.constants'
import { filterWarehouses, type WarehouseStatusFilter } from '../helpers/warehouses.manage'
import { selectManagedWarehouses, selectRecentWarehouse, selectWarehouses } from '../selectors/warehouses.selectors'
import { clearRecentWarehouse } from '../slices/warehouses.slice'
import { fetchWarehousesThunk, loadManagedWarehousesThunk } from '../thunks/warehouses.thunks'

export const useManagedWarehouses = () => {
    const dispatch = useAppDispatch()
    const { managed, managedStatus, managedError } = useAppSelector(selectManagedWarehouses)
    const selectorWarehouses = useAppSelector(selectWarehouses)
    const recent = useAppSelector(selectRecentWarehouse)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<WarehouseStatusFilter>('all')

    const reload = useCallback(() => {
        dispatch(loadManagedWarehousesThunk())
        dispatch(fetchWarehousesThunk())
    }, [dispatch])

    const retriedEmpty = useRef(false)
    useEffect(() => {
        if (managedStatus === 'idle') {
            reload()
        } else if (managedStatus === 'succeeded' && managed.length === 0 && !retriedEmpty.current) {
            retriedEmpty.current = true
            reload()
        }
    }, [managedStatus, managed.length, reload])

    useEffect(() => {
        if (!recent) return
        const timer = setTimeout(() => dispatch(clearRecentWarehouse()), RECENT_BADGE_MS)
        return () => clearTimeout(timer)
    }, [dispatch, recent])

    // Si managed tiene datos se usan; si aún no llegaron pero selectorWarehouses ya tiene datos, se usan como respaldo
    const all = useMemo(() => {
        if (managed.length > 0) return managed
        if (selectorWarehouses.length > 0) return selectorWarehouses
        return managed
    }, [managed, selectorWarehouses])

    const items = useMemo(() => filterWarehouses(all, search, status), [all, search, status])

    const clearFilters = () => {
        setSearch('')
        setStatus('all')
    }

    return {
        all,
        items,
        loading: managedStatus === 'idle' || managedStatus === 'loading',
        failed: managedStatus === 'failed' && all.length === 0,
        error: managedError,
        recent,
        search,
        setSearch,
        status,
        setStatus,
        hasFilters: search !== '' || status !== 'all',
        clearFilters,
        reload,
    }
}

export default useManagedWarehouses
