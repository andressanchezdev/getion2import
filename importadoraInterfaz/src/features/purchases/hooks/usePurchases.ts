// usePurchases · pide las órdenes de compra (globales o por bodega) y maneja la búsqueda y filtros
// conecta con: PurchasesTable (lo usa), purchases.thunks (loadPurchasesThunk), purchases.selectors, purchases.adapter (filtrar), purchases.rules (recepción) y auth (hay sesión)
// ojo: en modo «recepción» filtra las que esperan mercancía; en modo «orders» es general por defecto con dropdown de bodegas
import { useCallback, useEffect, useMemo, useState } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { filterPurchases } from '../helpers/purchases.adapter'
import { canReceive } from '../helpers/purchases.rules'
import { selectPurchases } from '../selectors/purchases.selectors'
import { loadPurchasesThunk } from '../thunks/purchases.thunks'
import type { PurchaseStatus } from '../types/purchases.types'

export type PurchasesMode = 'orders' | 'receiving'

export const usePurchases = (mode: PurchasesMode) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const warehouses = useAppSelector((state) => state.warehouses.items)
  const activeWarehouseId = Number(useAppSelector((state) => state.ui.activeWarehouseId)) || 0
  const activeWarehouseName = useAppSelector((state) => state.ui.activeWarehouseName) ?? ''
  const state = useAppSelector(selectPurchases)

  // En gestión ventas (orders) inicia en general (null = todas las bodegas); en recepción inicia en la activa
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    mode === 'receiving' && activeWarehouseId > 0 ? activeWarehouseId : null
  )
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PurchaseStatus | 'all'>('all')

  const reload = useCallback(() => {
    if (hasSession) {
      dispatch(loadPurchasesThunk(selectedWarehouseId ? selectedWarehouseId : undefined))
    }
  }, [dispatch, hasSession, selectedWarehouseId])

  useEffect(reload, [reload])

  const isCurrent = state.warehouseId === selectedWarehouseId
  const base = useMemo(() => (isCurrent ? state.items : []), [isCurrent, state.items])
  const items = useMemo(
    () => filterPurchases(mode === 'receiving' ? base.filter(canReceive) : base, search, mode === 'receiving' ? 'all' : status),
    [base, mode, search, status]
  )
  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    if (mode === 'orders') setSelectedWarehouseId(null)
  }

  return {
    items,
    total: mode === 'receiving' ? base.filter(canReceive).length : base.length,
    warehouseId: selectedWarehouseId ?? 0,
    selectedWarehouseId,
    setSelectedWarehouseId,
    warehouses,
    warehouseName: warehouses.find((w) => Number(w.id) === selectedWarehouseId)?.name || activeWarehouseName,
    loading: !isCurrent || state.status === 'idle' || state.status === 'loading',
    failed: isCurrent && state.status === 'failed',
    error: state.error,
    search,
    setSearch,
    status,
    setStatus,
    hasFilters: search !== '' || (mode === 'orders' && (status !== 'all' || selectedWarehouseId !== null)),
    clearFilters,
    reload,
  }
}
