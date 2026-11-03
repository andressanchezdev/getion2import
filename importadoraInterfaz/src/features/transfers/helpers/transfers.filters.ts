// transfers.filters · filtra la tabla de traslados por texto, tipo, ruta (entrantes o salientes de la bodega activa) y estado
// conecta con: TransfersScreen (la usa) y transfers.types (TransferFilters)
import type { TransferFilters, TrasladeItem } from '../types/transfers.types'

const matchesQuery = (item: TrasladeItem, query: string): boolean => {
  if (!query) return true
  const q = query.toLowerCase()
  const texts = [item.serialCode, item.originWarehouse.name, item.destWarehouse.name, item.employeeName, item.dispatchedByEmployeeName, item.receivedByEmployeeName]
  return (
    texts.some((text) => text?.toLowerCase().includes(q)) ||
    item.products.some((p) => p.description.toLowerCase().includes(q) || Boolean(p.code && p.code.toLowerCase().includes(q)))
  )
}

// filtra la tabla de traslados por texto, tipo, ruta y estado
export const filterTransfers = (items: TrasladeItem[], filters: TransferFilters, warehouseId: number): TrasladeItem[] => {
  const query = filters.query.trim()
  return items.filter((item) => {
    const matchType = filters.type === 'all' || item.type === filters.type
    const matchDirection =
      filters.direction === 'all' ||
      (filters.direction === 'incoming' && item.destWarehouse.id === warehouseId) ||
      (filters.direction === 'outgoing' && item.originWarehouse.id === warehouseId)
    const matchStatus =
      filters.status === 'all' || item.status === filters.status || (filters.status === 'novelty' && (item.status === 'with_novelty' || item.priority === 'high'))
    return matchesQuery(item, query) && matchType && matchDirection && matchStatus
  })
}

// dice si hay algún filtro puesto
export const hasTransferFilters = (filters: TransferFilters): boolean =>
  filters.query !== '' || filters.type !== 'all' || filters.direction !== 'all' || filters.status !== 'all'
