// useReturnsList · pide las devoluciones al montarse y al cambiar la bodega, y expone lo que la pantalla necesita (lista, KPIs, filtros y acciones)
// conecta con: ReturnsScreen; despacha returns.thunks y lee returns.selectors y returns.slice
// ojo: el filtro de bodega lo resuelve el backend (se vuelve a pedir); estado y búsqueda se aplican en memoria
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { clearReturnsFilters, setReturnsQuery, setReturnsStatus, setReturnsWarehouse } from '../slices/returns.slice'
import { selectReturns, selectReturnsCounts, selectVisibleReturns } from '../selectors/returns.selectors'
import { approveReturnThunk, loadReturnsThunk, rejectReturnThunk } from '../thunks/returns.thunks'
import type { ReturnDto, ReturnStatusFilter } from '../types/returns.types'

export const useReturnsList = () => {
  const dispatch = useAppDispatch()
  const { loading, warehouseId, status, query } = useAppSelector(selectReturns)
  const visible = useAppSelector(selectVisibleReturns)
  const counts = useAppSelector(selectReturnsCounts)

  useEffect(() => {
    dispatch(loadReturnsThunk())
  }, [dispatch, warehouseId])

  const reload = useCallback(() => dispatch(loadReturnsThunk()), [dispatch])
  const approve = useCallback((ret: ReturnDto) => dispatch(approveReturnThunk(ret.id)), [dispatch])
  const reject = useCallback((ret: ReturnDto) => dispatch(rejectReturnThunk(ret.id)), [dispatch])
  const setWarehouse = useCallback((id: number | null) => dispatch(setReturnsWarehouse(id)), [dispatch])
  const setStatus = useCallback((value: ReturnStatusFilter) => dispatch(setReturnsStatus(value)), [dispatch])
  const setQuery = useCallback((value: string) => dispatch(setReturnsQuery(value)), [dispatch])
  const clearFilters = useCallback(() => dispatch(clearReturnsFilters()), [dispatch])

  const hasFilters = status !== 'all' || query.trim() !== '' || warehouseId !== null
  return { loading, warehouseId, status, query, visible, counts, hasFilters, reload, approve, reject, setWarehouse, setStatus, setQuery, clearFilters }
}
