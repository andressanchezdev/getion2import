// shop.products.slice · lista de productos del catálogo que llega del backend: items, estado de carga, paginación y modo (lista o búsqueda)
// conecta con: shop.products.thunks (la llenan), shop.products.selectors (lecturas), shop.slice (al cambiar un filtro vuelve a la página 1) y rootReducer (clave 'products'; NO se guarda en el navegador)
// ojo: applyStockUpdate (tiempo real) vive aquí porque aquí está la lista; realtime.handlers lo importa desde features/shop
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { setActiveWarehouse } from '@/features/navigation'
import { resetFilters, setOnlyInStock, setSearchQuery, setSelectedBrand, setSelectedCategory } from './shop.slice'
import { loadProductsThunk } from '../thunks/shop.products.thunks'
import type { ProductsState } from '../types/shop.api.types'
import type { StockUpdate } from '../types/shop.types'

export const INITIAL_PRODUCTS_STATE: ProductsState = {
    items: [],
    status: 'idle',
    error: null,
    meta: null,
    mode: 'list',
    page: 1,
    requestId: null,
}

export const productsSlice = createSlice({
    name: 'products',
    initialState: INITIAL_PRODUCTS_STATE,
    reducers: {
        setProductsPage: (state, action: PayloadAction<number>) => {
            state.page = Math.max(1, action.payload)
        },
        // tiempo real: fija el stock de un producto en una bodega con el valor que manda el servidor
        applyStockUpdate: (state, action: PayloadAction<StockUpdate>) => {
            const { productId, warehouseId, stock } = action.payload
            const product = state.items.find((p) => p.id === productId)
            if (product) product.stockByWarehouse[warehouseId] = stock
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadProductsThunk.pending, (state, action) => {
                state.status = 'loading'
                state.error = null
                state.requestId = action.meta.requestId
            })
            .addCase(loadProductsThunk.fulfilled, (state, action) => {
                if (state.requestId !== action.meta.requestId) return // respuesta de una petición anterior: se descarta
                state.items = action.payload.products
                state.meta = action.payload.meta
                state.mode = action.payload.mode
                state.status = 'succeeded'
            })
            .addCase(loadProductsThunk.rejected, (state, action) => {
                if (state.requestId !== action.meta.requestId) return
                state.status = 'failed'
                state.error = action.payload ?? 'No se pudieron cargar los repuestos.'
            })
            // cualquier cambio de filtro, búsqueda o bodega empieza de nuevo en la página 1
            .addMatcher(
                isAnyOf(setSearchQuery, setSelectedBrand, setSelectedCategory, setOnlyInStock, resetFilters, setActiveWarehouse),
                (state) => {
                    state.page = 1
                }
            )
    },
})

export const { setProductsPage, applyStockUpdate } = productsSlice.actions
export const productsReducer = productsSlice.reducer
export default productsSlice.reducer
