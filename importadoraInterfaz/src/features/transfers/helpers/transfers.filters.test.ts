// transfers.filters.test · pruebas de los filtros de la tabla de traslados: texto, tipo, ruta de la bodega activa y estado (incluida la novedad prioritaria)
// conecta con: transfers.filters; se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_TRANSFER_FILTERS } from '../constants/transfers.constants'
import { filterTransfers, hasTransferFilters } from './transfers.filters'
import type { TransferFilters, TrasladeItem } from '../types/transfers.types'

const item = (id: number, overrides: Partial<TrasladeItem> = {}): TrasladeItem => ({
  id,
  serialCode: `TR-${id}`,
  type: 'inter_warehouse',
  typeLabel: 'Solicitud entre bodegas',
  status: 'pending',
  priority: 'normal',
  originWarehouse: { id: 1, name: 'Principal' },
  destWarehouse: { id: 2, name: 'Norte' },
  products: [{ itemId: id, productId: id, code: `REP-${id}`, description: `Pastillas ${id}`, quantity: 1, destinationLocation: 'A1' }],
  ...overrides,
})

const items = [
  item(1),
  item(2, { type: 'relocation', originWarehouse: { id: 2, name: 'Norte' }, destWarehouse: { id: 1, name: 'Principal' }, employeeName: 'Juan Pérez' }),
  item(3, { status: 'with_novelty' }),
  item(4, { priority: 'high', status: 'in_transit' }),
]
const filters = (partial: Partial<TransferFilters>): TransferFilters => ({ ...INITIAL_TRANSFER_FILTERS, ...partial })
const ids = (list: TrasladeItem[]) => list.map((i) => i.id)

describe('filterTransfers', () => {
  it('sin filtros devuelve todo', () => {
    expect(ids(filterTransfers(items, INITIAL_TRANSFER_FILTERS, 1))).toEqual([1, 2, 3, 4])
  })

  it('busca por serial, empleado, bodega y repuesto sin importar mayúsculas', () => {
    expect(ids(filterTransfers(items, filters({ query: 'tr-3' }), 1))).toEqual([3])
    expect(ids(filterTransfers(items, filters({ query: 'JUAN' }), 1))).toEqual([2])
    expect(ids(filterTransfers(items, filters({ query: 'rep-4' }), 1))).toEqual([4])
  })

  it('filtra por tipo', () => {
    expect(ids(filterTransfers(items, filters({ type: 'relocation' }), 1))).toEqual([2])
  })

  it('entrantes son los que llegan a la bodega activa y salientes los que salen de ella', () => {
    expect(ids(filterTransfers(items, filters({ direction: 'incoming' }), 1))).toEqual([2])
    expect(ids(filterTransfers(items, filters({ direction: 'outgoing' }), 1))).toEqual([1, 3, 4])
  })

  it('«novedad» trae los con novedad y los de alta prioridad', () => {
    expect(ids(filterTransfers(items, filters({ status: 'novelty' }), 1))).toEqual([3, 4])
    expect(ids(filterTransfers(items, filters({ status: 'in_transit' }), 1))).toEqual([4])
  })

  it('hasTransferFilters avisa si hay alguno activo', () => {
    expect(hasTransferFilters(INITIAL_TRANSFER_FILTERS)).toBe(false)
    expect(hasTransferFilters(filters({ status: 'pending' }))).toBe(true)
  })
})
