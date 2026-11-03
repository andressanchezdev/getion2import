// inventory.productStock.test · pruebas de las existencias de un producto y del guardado de tarifas en el estado de inventario
// conecta con: inventory.slice y inventory.thunks (solo sus tipos de acción); se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_INVENTORY_STATE } from '../constants/inventory.constants'
import { inventoryReducer } from './inventory.slice'
import { loadProductStockThunk, saveProductPricesThunk } from '../thunks/inventory.thunks'
import type { Product } from '@/features/shop'
import type { StockFullDto } from '../types/inventory.api.types'

const row = (stockId: number, warehouseId: number): StockFullDto => ({ stockId, warehouseId, productId: 5, available: 4, reserved: 1, sellable: 3 })
const product = { id: '5', code: 'A1', name: 'Anillos', prices: { p0: 1000, p1: 0, p2: 0, p3: 0 } } as unknown as Product

describe('existencias de un producto', () => {
  it('al pedir guarda de qué producto son y queda cargando', () => {
    const state = inventoryReducer(INITIAL_INVENTORY_STATE, loadProductStockThunk.pending('r1', 5))
    expect(state.productStock).toMatchObject({ productId: 5, status: 'loading', items: [] })
  })

  it('guarda las filas de la última carga', () => {
    let state = inventoryReducer(INITIAL_INVENTORY_STATE, loadProductStockThunk.pending('r1', 5))
    state = inventoryReducer(state, loadProductStockThunk.fulfilled([row(1, 1), row(2, 2)], 'r1', 5))
    expect(state.productStock.status).toBe('succeeded')
    expect(state.productStock.items.map((r) => r.stockId)).toEqual([1, 2])
  })

  it('al abrir otro producto se limpian las filas del anterior y se descarta la respuesta vieja', () => {
    let state = inventoryReducer(INITIAL_INVENTORY_STATE, loadProductStockThunk.pending('viejo', 5))
    state = inventoryReducer(state, loadProductStockThunk.pending('nuevo', 9))
    state = inventoryReducer(state, loadProductStockThunk.fulfilled([row(1, 1)], 'viejo', 5))
    expect(state.productStock).toMatchObject({ productId: 9, items: [], status: 'loading' })
  })

  it('si falla guarda el mensaje', () => {
    let state = inventoryReducer(INITIAL_INVENTORY_STATE, loadProductStockThunk.pending('r', 5))
    state = inventoryReducer(state, loadProductStockThunk.rejected(null, 'r', 5, 'Error al consultar existencias.'))
    expect(state.productStock).toMatchObject({ status: 'failed', error: 'Error al consultar existencias.' })
  })
})

describe('guardar tarifas', () => {
  it('actualiza las tarifas de la fila del producto en la tabla', () => {
    const base = { ...INITIAL_INVENTORY_STATE, products: { ...INITIAL_INVENTORY_STATE.products, items: [product] } }
    const prices = { p0: 2000, p1: 1800, p2: 1600, p3: 1500 }
    const state = inventoryReducer(base, saveProductPricesThunk.fulfilled({ id: '5', prices }, 's', { id: '5', prices }))
    expect(state.products.items[0].prices).toEqual(prices)
  })
})
