// shop.products.slice · lista de productos del catálogo que llega del backend: items, estado de carga, paginación y modo (lista o búsqueda)
// conecta con: shop.products.thunks (la llenan), shop.products.selectors (lecturas), shop.slice (al cambiar un filtro vuelve a la página 1) y rootReducer (clave 'products'; NO se guarda en el navegador)
// ojo: applyStockUpdate (tiempo real) vive aquí porque aquí está la lista; realtime.handlers lo importa desde features/shop
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { setActiveWarehouse } from '@/features/navigation'
import { isNewer } from '@/global/helpers/realtime/applyVersioned'
import { toProduct } from '../helpers/shop.adapter'
import { resetFilters, setOnlyInStock, setSearchQuery, setSelectedBrand, setSelectedCategory } from './shop.slice'
import { loadProductsThunk, updateProductPricesThunk } from '../thunks/shop.products.thunks'
import type { ProductDto, ProductsState } from '../types/shop.api.types'
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
        // tiempo real (stock.changed): aplica los totales por producto y bodega en un solo paso
        stockTotalsFromEvent: (
            state,
            action: PayloadAction<Array<{ productId: number; warehouseId: number; sellable: number }>>
        ) => {
            for (const total of action.payload) {
                const product = state.items.find((p) => p.id === String(total.productId))
                if (product) {
                    product.stockByWarehouse[String(total.warehouseId)] = Math.max(0, total.sellable)
                }
            }
        },
        // tiempo real (product.prices_changed): tarifas nuevas del producto en el catálogo de la tienda (la API numera p1 a p4; la app, p0 a p3)
        productPricesFromEvent: (state, action: PayloadAction<{ productId: number; prices: { p1: number; p2: number; p3: number; p4: number }; version: string }>) => {
            const item = state.items.find((p) => p.id === String(action.payload.productId))
            if (!item || !isNewer(action.payload.version, item.updatedAt)) return
            const { p1, p2, p3, p4 } = action.payload.prices
            item.prices = { p0: p1, p1: p2, p2: p3, p3: p4 }
            item.updatedAt = action.payload.version
        },
        // tiempo real (entity.status_changed kind=product): quita del catálogo si pasa a inactivo o lo restaura si pasa a activo
        productStatusFromEvent: (
            state,
            action: PayloadAction<{ id: number; version: string; to: string; row?: ProductDto | null; activeWarehouseId?: number }>
        ) => {
            const { id, version, to, row, activeWarehouseId } = action.payload
            const pid = String(id)
            const idx = state.items.findIndex((p) => p.id === pid)
            if (to !== 'active') {
                if (idx !== -1 && isNewer(version, state.items[idx].updatedAt)) {
                    state.items.splice(idx, 1)
                }
                return
            }
            if (!row) return
            const incoming = toProduct({ ...row, status: 'active', updatedAt: version }, activeWarehouseId)
            if (idx !== -1) {
                if (!isNewer(version, state.items[idx].updatedAt)) return
                const prevStock = state.items[idx].stockByWarehouse
                state.items[idx] = {
                    ...state.items[idx],
                    ...incoming,
                    stockByWarehouse: Object.keys(incoming.stockByWarehouse).length > 0 ? incoming.stockByWarehouse : prevStock,
                }
            } else {
                state.items.unshift(incoming)
            }
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
                const currentById = new Map(state.items.map((item) => [item.id, item]))
                state.items = action.payload.products.map((incoming) => {
                    const existing = currentById.get(incoming.id)
                    if (existing && existing.updatedAt && !isNewer(incoming.updatedAt, existing.updatedAt)) {
                        return { ...incoming, ...existing, stockByWarehouse: { ...incoming.stockByWarehouse, ...existing.stockByWarehouse } }
                    }
                    return incoming
                })
                state.meta = action.payload.meta
                state.mode = action.payload.mode
                state.status = 'succeeded'
            })
            .addCase(loadProductsThunk.rejected, (state, action) => {
                if (state.requestId !== action.meta.requestId) return
                state.status = 'failed'
                state.error = action.payload ?? 'No se pudieron cargar los repuestos.'
            })
            // precios guardados: la tarjeta del catálogo muestra las tarifas nuevas sin recargar la lista
            .addCase(updateProductPricesThunk.fulfilled, (state, action) => {
                const product = state.items.find((item) => item.id === action.payload.productId)
                if (product) product.prices = action.payload.prices
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

export const {
    setProductsPage,
    applyStockUpdate,
    stockTotalsFromEvent,
    productStatusFromEvent,
    productPricesFromEvent,
} = productsSlice.actions
export const productsReducer = productsSlice.reducer
export default productsSlice.reducer
