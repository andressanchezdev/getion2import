// shop.selectors.test · pruebas de las lecturas del carrito (líneas con nivel, cantidades por producto, totales) y de "hay filtros activos"
// conecta con: shop.selectors; no usa red ni store real
import { describe, expect, it } from 'vitest'
import { INITIAL_SHOP_STATE } from '../constants/shop.constants'
import {
  selectCartDrawerMeta,
  selectCartItems,
  selectCartQuantities,
  selectCartTotals,
  selectHasActiveFilters,
} from './shop.selectors'
import type { CartState } from '../types/shop.cart.api.types'
import type { CartItem, Product, ShopState } from '../types/shop.types'

const product = (id: string): Product => ({
  id,
  code: id,
  name: id,
  brand: '',
  category: '',
  prices: { p0: 0, p1: 0, p2: 0, p3: 0 },
  stockByWarehouse: {},
})

const line = (cartId: number, productId: string, quantity: number, price: number): CartItem => ({
  cartId,
  productId,
  product: product(productId),
  quantity,
  selectedPrice: price,
  priceLevel: null,
  subtotal: price * quantity,
})

const makeState = (items: CartItem[], shop: Partial<ShopState> = {}) => ({
  shop: { ...INITIAL_SHOP_STATE, ...shop },
  cart: { items, status: 'succeeded', error: null, mutating: false } as CartState,
})

describe('selectCartItems', () => {
  it('une a cada línea el nivel de precio con que se agregó (si se sabe)', () => {
    const state = makeState([line(1, 'a', 1, 100), line(2, 'b', 1, 100)], { cartLevels: { a: 'P2' } })
    expect(selectCartItems(state).map((item) => item.priceLevel)).toEqual(['P2', null])
  })
})

describe('selectCartQuantities', () => {
  it('suma la cantidad por producto', () => {
    const state = makeState([line(1, 'a', 2, 100), line(2, 'a', 3, 100), line(3, 'b', 1, 100)])
    expect(selectCartQuantities(state)).toEqual({ a: 5, b: 1 })
  })
})

describe('selectCartTotals y selectCartDrawerMeta', () => {
  it('calcula el total a facturar y la cantidad de artículos', () => {
    const state = makeState([line(1, 'a', 2, 1000), line(2, 'b', 1, 500)])
    expect(selectCartTotals(state)).toEqual({ totalAmount: 2500, totalItemsCount: 3 })
    expect(selectCartDrawerMeta(state)).toEqual({ title: 'Carrito', badge: '3 artículos' })
  })

  it('un solo artículo va en singular', () => {
    expect(selectCartDrawerMeta(makeState([line(1, 'a', 1, 100)])).badge).toBe('1 artículo')
  })

  it('carrito vacío: total 0', () => {
    expect(selectCartTotals(makeState([]))).toEqual({ totalAmount: 0, totalItemsCount: 0 })
  })
})

describe('selectHasActiveFilters', () => {
  it('sin filtros es false', () => {
    expect(selectHasActiveFilters(makeState([]))).toBe(false)
  })

  it('un texto, una marca, una categoría o "con stock" lo vuelven true', () => {
    const f = INITIAL_SHOP_STATE.filters
    expect(selectHasActiveFilters(makeState([], { filters: { ...f, searchQuery: ' freno ' } }))).toBe(true)
    expect(selectHasActiveFilters(makeState([], { filters: { ...f, selectedBrandId: 1 } }))).toBe(true)
    expect(selectHasActiveFilters(makeState([], { filters: { ...f, selectedCategoryId: 2 } }))).toBe(true)
    expect(selectHasActiveFilters(makeState([], { filters: { ...f, onlyInStock: true } }))).toBe(true)
  })

  it('un texto de solo espacios no cuenta', () => {
    const f = INITIAL_SHOP_STATE.filters
    expect(selectHasActiveFilters(makeState([], { filters: { ...f, searchQuery: '   ' } }))).toBe(false)
  })
})
