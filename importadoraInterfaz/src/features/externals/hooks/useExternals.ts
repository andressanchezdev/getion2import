// useExternals · pide los proveedores o transportadoras y maneja la búsqueda y el filtro de estado de la tabla
// conecta con: ExternalsTable (lo usa), externals.thunks, externals.selectors, externals.filters (filtrar) y auth (hay sesión)
// ojo: mientras llega la lista del otro tipo no se muestra la del anterior
import { useCallback, useEffect, useMemo, useState } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { filterExternals } from '../helpers/externals.filters'
import { selectExternals } from '../selectors/externals.selectors'
import { loadExternalsThunk } from '../thunks/externals.thunks'
import type { ExternalKind, ExternalStatusFilter } from '../types/externals.types'

export const useExternals = (kind: ExternalKind) => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const state = useAppSelector(selectExternals)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ExternalStatusFilter>('all')

  // vuelve a pedir la lista (por ejemplo después de guardar un registro)
  const reload = useCallback(() => {
    if (hasSession) dispatch(loadExternalsThunk(kind))
  }, [dispatch, hasSession, kind])

  useEffect(reload, [reload])

  const isCurrent = state.kind === kind
  const items = useMemo(() => filterExternals(isCurrent ? state.items : [], search, status), [isCurrent, state.items, search, status])
  const clearFilters = () => {
    setSearch('')
    setStatus('all')
  }

  return {
    items,
    total: isCurrent ? state.items.length : 0,
    loading: !isCurrent || state.status === 'idle' || state.status === 'loading',
    failed: isCurrent && state.status === 'failed',
    error: state.error,
    search,
    setSearch,
    status,
    setStatus,
    hasFilters: search !== '' || status !== 'all',
    clearFilters,
    reload,
  }
}
