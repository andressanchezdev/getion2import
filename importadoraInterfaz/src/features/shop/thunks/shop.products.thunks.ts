// shop.products.thunks · carga los productos del catálogo: con filtros y página (modo "list") o por texto (modo "search")
// conecta con: shop.products.service (llamadas), auth (selectRequestContext), shop.slice (filtros), navigation (bodega activa) y shop.products.slice (reacciona); la despacha useProductsLoader
// ojo: lee los filtros y la página DEL STORE en el momento de ejecutarse; si llegan dos cargas seguidas, el slice se queda solo con la última (compara requestId)
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, type PaginatorMetadata } from '@/api'
import type { NavigationState } from '@/features/navigation'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { PRODUCTS_PAGE_SIZE, SEARCH_LIMIT } from '../constants/shop.constants'
import { toWarehouseNumber } from '../helpers/shop.helpers'
import { fetchProductsPage, searchProducts } from '../services/shop.products.service'
import type { ProductsMode, ProductsState } from '../types/shop.api.types'
import type { Product, ShopState } from '../types/shop.types'

type ThunkState = { auth: AuthState; shop: ShopState; ui: NavigationState; products: ProductsState }

export interface ProductsResult {
    products: Product[]
    meta: PaginatorMetadata | null
    mode: ProductsMode
}

export const loadProductsThunk = createAsyncThunk<ProductsResult, void, { state: ThunkState; rejectValue: string }>(
    'shop/loadProducts',
    async (_, { getState, rejectWithValue }) => {
        const state = getState()
        const ctx = selectRequestContext(state)
        if (!ctx) return rejectWithValue('No hay una sesión activa.')

        const { filters } = state.shop
        const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
        const text = filters.searchQuery.trim()

        try {
            if (text) {
                const products = await searchProducts(ctx, text, SEARCH_LIMIT, warehouseId)
                return { products, meta: null, mode: 'search' }
            }
            const page = await fetchProductsPage(ctx, {
                page: state.products.page,
                pageSize: PRODUCTS_PAGE_SIZE,
                warehouseId,
                brandId: filters.selectedBrandId,
                categoryId: filters.selectedCategoryId,
                onlyInStock: filters.onlyInStock,
            })
            return { products: page.items, meta: page.meta, mode: 'list' }
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los repuestos.'))
        }
    }
)
