// shop.products.selectors.test · pruebas de los productos visibles (filtros en pantalla solo en modo búsqueda) y del resumen "X de Y"
// conecta con: shop.products.selectors; la sesión está simulada para no cargar toda la feature auth
import { describe, expect, it, vi } from 'vitest'
import { INITIAL_NAVIGATION_STATE } from '@/features/navigation'
import { INITIAL_SHOP_STATE } from '../constants/shop.constants'
import { selectResultsSummary, selectVisibleProducts } from './shop.products.selectors'
import type { Product } from '../types/shop.types'

vi.mock('@/features/auth', () => ({ selectRequestContext: () => null }))

const product = (id: string, brand: string, category: string, stock: number): Product => ({
  id,
  code: id,
  name: id,
  brand,
  category,
  prices: { p0: 1, p1: 1, p2: 1, p3: 1 },
  stockByWarehouse: { '1': stock },
})

// ojo: los estados se arman aquí mismo (y no con los INITIAL_ de otras capas) para que el test respete las capas del proyecto
const BASE_PRODUCTS = { status: 'succeeded' as const, error: null, mode: 'list' as const, page: 1, requestId: null }
const emptyResource = { items: [], status: 'idle' as const, error: null }

const items = [product('a', 'Yamaha', 'Frenos', 5), product('b', 'Honda', 'Frenos', 0), product('c', 'Yamaha', 'Motor', 3)]

const makeState = (mode: 'list' | 'search', filters: Partial<typeof INITIAL_SHOP_STATE.filters> = {}, totalRecords = 90) => ({
  products: { ...BASE_PRODUCTS, items, mode, meta: mode === 'list' ? { currentPage: 1, pageSize: 30, totalRecords, totalPages: 3, hasNextPage: true, hasPrevPage: false } : null },
  shop: { ...INITIAL_SHOP_STATE, filters: { ...INITIAL_SHOP_STATE.filters, ...filters } },
  ui: { ...INITIAL_NAVIGATION_STATE, activeWarehouseId: '1' },
  catalogs: {
    models: emptyResource,
    brands: { items: [{ id: 10, name: 'Yamaha' }, { id: 11, name: 'Honda' }], status: 'succeeded' as const, error: null },
    categories: { items: [{ id: 20, name: 'Frenos' }, { id: 21, name: 'Motor' }], status: 'succeeded' as const, error: null },
  },
})

describe('selectVisibleProducts', () => {
  it('en modo lista devuelve todo tal cual (los filtros ya los aplicó el backend)', () => {
    expect(selectVisibleProducts(makeState('list', { selectedBrandId: 10 }))).toHaveLength(3)
  })

  it('en modo búsqueda filtra por marca', () => {
    expect(selectVisibleProducts(makeState('search', { selectedBrandId: 10 })).map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('en modo búsqueda filtra por categoría', () => {
    expect(selectVisibleProducts(makeState('search', { selectedCategoryId: 21 })).map((p) => p.id)).toEqual(['c'])
  })

  it('en modo búsqueda "con stock" usa la bodega activa', () => {
    expect(selectVisibleProducts(makeState('search', { onlyInStock: true })).map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('combina marca, categoría y stock', () => {
    expect(selectVisibleProducts(makeState('search', { selectedBrandId: 10, selectedCategoryId: 20, onlyInStock: true })).map((p) => p.id)).toEqual(['a'])
  })

  it('en modo búsqueda, una marca que no está en el catálogo no filtra', () => {
    expect(selectVisibleProducts(makeState('search', { selectedBrandId: 999 }))).toHaveLength(3)
  })
})

describe('selectResultsSummary', () => {
  it('en modo lista el total es el del backend (todas las páginas)', () => {
    expect(selectResultsSummary(makeState('list', {}, 90))).toEqual({ shown: 3, total: 90 })
  })

  it('en modo búsqueda el total es lo que devolvió la búsqueda', () => {
    expect(selectResultsSummary(makeState('search', { onlyInStock: true }))).toEqual({ shown: 2, total: 3 })
  })
})
