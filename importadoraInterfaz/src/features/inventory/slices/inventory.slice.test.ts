// inventory.slice.test · pruebas del estado de las tablas de inventario: carga, descarte de respuestas viejas y vaciado al cambiar de bodega
// conecta con: inventory.slice y navigation (setActiveWarehouse); se corre con npm test
import { describe, expect, it } from 'vitest'
import { setActiveWarehouse } from '@/features/navigation'
import { INITIAL_INVENTORY_STATE } from '../constants/inventory.constants'
import { inventoryReducer, setInventoryPage, setInventoryQuery } from './inventory.slice'
import { loadStockTableThunk } from '../thunks/inventory.thunks'

const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const row = { id: 1, productCode: 'A1', productName: 'ANILLOS', category: '', brand: '', location: '', available: 5, reserved: 1, sellable: 4, minStock: 0, level: 'low' as const }

describe('inventory.slice', () => {
  it('escribir en la búsqueda vuelve a la página 1', () => {
    let state = inventoryReducer(INITIAL_INVENTORY_STATE, setInventoryPage({ table: 'stock', page: 3 }))
    state = inventoryReducer(state, setInventoryQuery({ table: 'stock', query: 'anillos' }))
    expect(state.stock).toMatchObject({ query: 'anillos', page: 1 })
  })

  it('guarda la respuesta de la última carga y descarta la de una carga anterior', () => {
    const second = { type: loadStockTableThunk.pending.type, meta: { requestId: 'r2', arg: { page: 1, query: '' } } }
    let state = inventoryReducer(INITIAL_INVENTORY_STATE, { type: loadStockTableThunk.pending.type, meta: { requestId: 'r1', arg: { page: 1, query: '' } } })
    state = inventoryReducer(state, second)
    // llega tarde la respuesta de r1: se ignora
    state = inventoryReducer(state, { type: loadStockTableThunk.fulfilled.type, payload: { items: [], meta }, meta: { requestId: 'r1' } })
    expect(state.stock.status).toBe('loading')
    state = inventoryReducer(state, { type: loadStockTableThunk.fulfilled.type, payload: { items: [row], meta }, meta: { requestId: 'r2' } })
    expect(state.stock).toMatchObject({ status: 'succeeded', items: [row] })
  })

  it('al cambiar de bodega las tablas se vacían (los números eran de la otra bodega)', () => {
    const loaded = inventoryReducer(
      inventoryReducer(INITIAL_INVENTORY_STATE, { type: loadStockTableThunk.pending.type, meta: { requestId: 'r1', arg: { page: 1, query: '' } } }),
      { type: loadStockTableThunk.fulfilled.type, payload: { items: [row], meta }, meta: { requestId: 'r1' } }
    )
    expect(inventoryReducer(loaded, setActiveWarehouse({ id: '2', name: 'Norte' }))).toEqual(INITIAL_INVENTORY_STATE)
  })
})
