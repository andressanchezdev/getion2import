// shop.slice.test · pruebas del estado guardado de la tienda: filtros por id, uuid y niveles del carrito, y limpieza al cerrar sesión
// conecta con: shop.slice; se simulan las acciones (no hay red)
import { describe, expect, it } from 'vitest'
import { INITIAL_SHOP_STATE } from '../constants/shop.constants'
import {
  resetFilters,
  setOnlyInStock,
  setPriceLevel,
  setSearchQuery,
  setSelectedBrand,
  setSelectedCategory,
  shopReducer,
} from './shop.slice'
import { addToCartThunk } from '../thunks/shop.cart.thunks'
import { clearCartThunk } from '../thunks/shop.cart.update.thunks'
import type { Product } from '../types/shop.types'

const product: Product = {
  id: '5',
  code: 'A',
  name: 'A',
  brand: '',
  category: '',
  prices: { p0: 1, p1: 1, p2: 1, p3: 1 },
  stockByWarehouse: {},
}
const addArg = { product, quantity: 1, priceLevel: 'P2' as const }

describe('filtros', () => {
  it('marca y categoría se guardan como id (null = todas)', () => {
    let state = shopReducer(INITIAL_SHOP_STATE, setSelectedBrand(4))
    state = shopReducer(state, setSelectedCategory(9))
    expect(state.filters).toMatchObject({ selectedBrandId: 4, selectedCategoryId: 9 })
    state = shopReducer(state, setSelectedBrand(null))
    expect(state.filters.selectedBrandId).toBeNull()
  })

  it('resetFilters limpia todo pero conserva el nivel de precio', () => {
    let state = shopReducer(INITIAL_SHOP_STATE, setPriceLevel('P3'))
    state = shopReducer(state, setSearchQuery('freno'))
    state = shopReducer(state, setOnlyInStock(true))
    state = shopReducer(state, setSelectedBrand(4))
    state = shopReducer(state, resetFilters())
    expect(state.filters).toEqual({ ...INITIAL_SHOP_STATE.filters, priceLevel: 'P3' })
  })
})

describe('carrito (lo que se guarda)', () => {
  it('al agregar el primer producto guarda el uuid y el nivel con que se agregó', () => {
    const state = shopReducer(INITIAL_SHOP_STATE, addToCartThunk.fulfilled({ items: [], uuid: 'u-1' }, 'r1', addArg))
    expect(state.cartUuid).toBe('u-1')
    expect(state.cartLevels).toEqual({ '5': 'P2' })
  })

  it('vaciar el carrito olvida los niveles pero conserva el uuid', () => {
    const withCart = { ...INITIAL_SHOP_STATE, cartUuid: 'u-1', cartLevels: { '5': 'P2' as const } }
    const state = shopReducer(withCart, clearCartThunk.fulfilled([], 'r2'))
    expect(state).toMatchObject({ cartUuid: 'u-1', cartLevels: {} })
  })

  it('cerrar sesión olvida el uuid y los niveles', () => {
    const withCart = { ...INITIAL_SHOP_STATE, cartUuid: 'u-1', cartLevels: { '5': 'P2' as const } }
    const state = shopReducer(withCart, { type: 'auth/logout/fulfilled' })
    expect(state).toMatchObject({ cartUuid: '', cartLevels: {} })
  })
})
