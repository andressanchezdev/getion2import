// shop.products.slice.test · pruebas de la lista de productos: carga, respuestas viejas descartadas, vuelta a la página 1 y stock en tiempo real
// conecta con: shop.products.slice; se simulan las acciones de la carga (no hay red)
import { describe, expect, it } from 'vitest'
import { applyStockUpdate, productsReducer, setProductsPage, INITIAL_PRODUCTS_STATE } from './shop.products.slice'
import { resetFilters, setOnlyInStock, setSearchQuery, setSelectedBrand } from './shop.slice'
import { loadProductsThunk } from '../thunks/shop.products.thunks'
import type { Product } from '../types/shop.types'

const product = (id: string): Product => ({
  id,
  code: id,
  name: id,
  brand: '',
  category: '',
  prices: { p0: 1, p1: 1, p2: 1, p3: 1 },
  stockByWarehouse: { '1': 5 },
})

const meta = { currentPage: 1, pageSize: 30, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }

describe('shop.products.slice', () => {
  it('pending deja "loading" y recuerda la petición', () => {
    const state = productsReducer(INITIAL_PRODUCTS_STATE, loadProductsThunk.pending('req-1'))
    expect(state.status).toBe('loading')
    expect(state.requestId).toBe('req-1')
  })

  it('fulfilled guarda productos, meta y modo', () => {
    const loading = productsReducer(INITIAL_PRODUCTS_STATE, loadProductsThunk.pending('req-1'))
    const state = productsReducer(loading, loadProductsThunk.fulfilled({ products: [product('1')], meta, mode: 'list' }, 'req-1'))
    expect(state).toMatchObject({ status: 'succeeded', mode: 'list', meta })
    expect(state.items).toHaveLength(1)
  })

  it('descarta la respuesta de una petición anterior', () => {
    let state = productsReducer(INITIAL_PRODUCTS_STATE, loadProductsThunk.pending('req-1'))
    state = productsReducer(state, loadProductsThunk.pending('req-2')) // llegó una carga más nueva
    state = productsReducer(state, loadProductsThunk.fulfilled({ products: [product('viejo')], meta, mode: 'list' }, 'req-1'))
    expect(state.items).toEqual([])
    expect(state.status).toBe('loading')
  })

  it('rejected guarda el mensaje y deja "failed" (solo de la petición vigente)', () => {
    let state = productsReducer(INITIAL_PRODUCTS_STATE, loadProductsThunk.pending('req-1'))
    state = productsReducer(state, loadProductsThunk.rejected(null, 'req-OTRA', undefined, 'ignorado'))
    expect(state.status).toBe('loading')
    state = productsReducer(state, loadProductsThunk.rejected(null, 'req-1', undefined, 'Servidor caído'))
    expect(state).toMatchObject({ status: 'failed', error: 'Servidor caído' })
  })

  it('setProductsPage nunca baja de 1', () => {
    expect(productsReducer(INITIAL_PRODUCTS_STATE, setProductsPage(3)).page).toBe(3)
    expect(productsReducer(INITIAL_PRODUCTS_STATE, setProductsPage(-2)).page).toBe(1)
  })

  it('cambiar un filtro o la búsqueda vuelve a la página 1', () => {
    const onPage3 = { ...INITIAL_PRODUCTS_STATE, page: 3 }
    expect(productsReducer(onPage3, setSelectedBrand(2)).page).toBe(1)
    expect(productsReducer(onPage3, setOnlyInStock(true)).page).toBe(1)
    expect(productsReducer(onPage3, setSearchQuery('freno')).page).toBe(1)
    expect(productsReducer(onPage3, resetFilters()).page).toBe(1)
  })

  it('applyStockUpdate fija el stock de un producto en una bodega', () => {
    const state = { ...INITIAL_PRODUCTS_STATE, items: [product('1')] }
    const next = productsReducer(state, applyStockUpdate({ productId: '1', warehouseId: '1', stock: 2 }))
    expect(next.items[0].stockByWarehouse['1']).toBe(2)
  })

  it('applyStockUpdate de un producto que no está en la lista no hace nada', () => {
    const state = { ...INITIAL_PRODUCTS_STATE, items: [product('1')] }
    expect(productsReducer(state, applyStockUpdate({ productId: '99', warehouseId: '1', stock: 2 })).items).toEqual(state.items)
  })
})
