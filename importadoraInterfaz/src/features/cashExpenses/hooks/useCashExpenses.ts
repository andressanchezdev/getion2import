// useCashExpenses · carga la lista de Facturas (gastos de las cajas cerradas) según los filtros y la página, con espera al escribir
// conecta con: CashExpensesTable (lo usa), cashExpenses.service (pide la página), auth (hay sesión) y useDebouncedValue
// ojo: cambiar un filtro vuelve a la página 1; «cargando» es que lo guardado no es de la consulta actual, así una respuesta que llega tarde (ya se pidió otra) no se muestra
import { useEffect, useState } from 'react'
import { EMPTY_META, getErrorMessage, type PaginatorMetadata } from '@/api'
import { selectCurrentUser } from '@/features/auth'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { INITIAL_CASH_EXPENSE_FILTERS } from '../helpers/cashExpenses.adapter'
import { fetchCashExpenses } from '../services/cashExpenses.service'
import type { CashExpenseFilters, CashExpenseRecord } from '../types/cashExpenses.types'

const SEARCH_DELAY_MS = 350

interface LoadedPage {
  key: string // de qué consulta es esta página
  items: CashExpenseRecord[]
  meta: PaginatorMetadata
  error: string | null
}

export const useCashExpenses = () => {
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const [filters, setFilters] = useState<CashExpenseFilters>(INITIAL_CASH_EXPENSE_FILTERS)
  const [page, setPage] = useState(1)
  const [loaded, setLoaded] = useState<LoadedPage | null>(null)
  const query = useDebouncedValue(filters.query, SEARCH_DELAY_MS)
  const key = JSON.stringify([query, filters.warehouseId, filters.from, filters.to, page])

  const setFilter = <K extends keyof CashExpenseFilters>(name: K, value: CashExpenseFilters[K]) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }
  const clearFilters = () => {
    setFilters(INITIAL_CASH_EXPENSE_FILTERS)
    setPage(1)
  }

  useEffect(() => {
    if (!hasSession) return
    let cancelled = false
    fetchCashExpenses({ ...filters, query }, page)
      .then((result) => !cancelled && setLoaded({ key, items: result.items, meta: result.meta, error: null }))
      .catch((reason) => !cancelled && setLoaded({ key, items: [], meta: EMPTY_META, error: getErrorMessage(reason, 'No se pudieron cargar las facturas de las cajas.') }))
    return () => {
      cancelled = true
    }
    // filters.query se reemplaza por query (con espera): el resto de filtros sí dispara la consulta al instante
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession, key])

  const current = loaded && loaded.key === key ? loaded : null
  return {
    filters,
    setFilter,
    clearFilters,
    items: current?.items ?? loaded?.items ?? [],
    meta: current?.meta ?? loaded?.meta ?? EMPTY_META,
    loading: current === null,
    error: current?.error ?? null,
    setPage,
  }
}
