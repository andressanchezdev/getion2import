// useStockTable · pide las existencias de la bodega activa (una fila por producto y ubicación) y maneja la búsqueda, la ubicación, la categoría y la marca
// conecta con: StockScreen y StockTable (lo usan), inventory.thunks (loadStockTableThunk), inventory.selectors, inventory.stock (filtros y totales), locations (useLocations: las ubicaciones activas) y auth (hay sesión)
// ojo: búsqueda, ubicación y página las resuelve el servidor; categoría y marca filtran las filas ya cargadas de la página; los totales son los de las filas que se ven
import { useCallback, useEffect, useMemo, useState } from 'react'
import { selectCurrentUser } from '@/features/auth'
import { useLocations } from '@/features/locations'
import { useDebouncedValue } from '@/global/hooks/data/useDebouncedValue'
import { useAppDispatch, useAppSelector } from '@/global/hooks/store/useRedux'
import { distinctValues, EMPTY_STOCK_FILTERS, filterStockRows, locationCountByProduct, productTotals, stockTotals, type StockFilters } from '../helpers/inventory.stock'
import { selectStockTable } from '../selectors/inventory.selectors'
import { setInventoryPage, setInventoryQuery } from '../slices/inventory.slice'
import { loadStockTableThunk } from '../thunks/inventory.thunks'

const SEARCH_DELAY_MS = 350

export const useStockTable = () => {
  const dispatch = useAppDispatch()
  const hasSession = Boolean(useAppSelector(selectCurrentUser))
  const warehouseId = useAppSelector((state) => state.ui.activeWarehouseId)
  const warehouseName = useAppSelector((state) => state.ui.activeWarehouseName)
  const table = useAppSelector(selectStockTable)
  const locations = useLocations()
  const [location, setLocation] = useState('')
  const [filters, setFilters] = useState<StockFilters>(EMPTY_STOCK_FILTERS)
  const query = useDebouncedValue(table.query, SEARCH_DELAY_MS)

  const reload = useCallback(() => {
    if (hasSession) dispatch(loadStockTableThunk({ page: table.page, query, location }))
  }, [dispatch, hasSession, table.page, query, location])

  useEffect(reload, [reload, warehouseId])

  const rows = useMemo(() => filterStockRows(table.items, filters), [table.items, filters])
  const hasFilters = Boolean(table.query || location || filters.category || filters.brand)

  const setSearch = (value: string) => dispatch(setInventoryQuery({ table: 'stock', query: value }))
  const changeLocation = (value: string) => {
    setLocation(value)
    dispatch(setInventoryPage({ table: 'stock', page: 1 }))
  }
  const clearFilters = () => {
    setSearch('')
    setLocation('')
    setFilters(EMPTY_STOCK_FILTERS)
  }

  return {
    rows,
    meta: table.meta,
    status: table.status,
    error: table.error,
    search: table.query,
    setSearch,
    setPage: (page: number) => dispatch(setInventoryPage({ table: 'stock', page })),
    location,
    setLocation: changeLocation,
    locationOptions: locations.items.filter((item) => item.isActive).map((item) => ({ value: item.code, label: item.code })),
    filters,
    setFilter: (patch: Partial<StockFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    categoryOptions: distinctValues(table.items, 'category').map((value) => ({ value, label: value })),
    brandOptions: distinctValues(table.items, 'brand').map((value) => ({ value, label: value })),
    hasFilters,
    clearFilters,
    locationCounts: useMemo(() => locationCountByProduct(table.items), [table.items]),
    productSums: useMemo(() => productTotals(table.items), [table.items]),
    totals: useMemo(() => stockTotals(rows), [rows]),
    warehouseId: Number(warehouseId) || 0,
    warehouseName: warehouseName ?? '',
    reload,
  }
}
