// inventory.slice · estado de las tablas de inventario: productos y stock (items, página, búsqueda, estado de carga y error)
// conecta con: inventory.thunks (lo llenan), inventory.selectors (lecturas), navigation (al cambiar de bodega se vacía) y rootReducer (clave 'inventory'; NO se guarda en el navegador)
// ojo: se vacía al cambiar de bodega (los números son de esa bodega) y al cerrar sesión; al saltar de compañía rootReducer lo reinicia
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { setActiveWarehouse } from '@/features/navigation'
import type { Product, ProductPrices } from '@/features/shop'
import type { StockRowChange } from '@/features/realtime'
import { isNewer } from '@/global/helpers/realtime/applyVersioned'
import { INITIAL_INVENTORY_STATE } from '../constants/inventory.constants'
import { stockLevelOf } from '../helpers/inventory.adapter'
import { loadProductStockThunk, loadProductsTableThunk, loadStockTableThunk, saveProductPricesThunk } from '../thunks/inventory.thunks'

import type { CountRealtimeEvent } from '../types/inventory.types'

type TableKey = 'products' | 'stock'
// quita una clave de cada variante de una unión (Omit a secas las mezcla)
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export const inventorySlice = createSlice({
  name: 'inventory',
  initialState: INITIAL_INVENTORY_STATE,
  reducers: {
    // tiempo real (product.prices_changed): las tarifas nuevas del producto en la tabla (la API numera p1 a p4; la app, p0 a p3)
    productPricesFromEvent: (state, action: PayloadAction<{ productId: number; prices: { p1: number; p2: number; p3: number; p4: number } }>) => {
      const item = state.products.items.find((p) => String(p.id) === String(action.payload.productId))
      const { p1, p2, p3, p4 } = action.payload.prices
      if (item) item.prices = { p0: p1, p1: p2, p2: p3, p3: p4 }
    },
    // tiempo real (count.*): guarda el evento para la pantalla de conteos, que tiene su lista en el hook
    countEventReceived: (state, action: PayloadAction<DistributiveOmit<CountRealtimeEvent, 'n'>>) => {
      state.countEvent = { ...action.payload, n: (state.countEvent?.n ?? 0) + 1 } as CountRealtimeEvent
    },
    setInventoryQuery: (state, action: PayloadAction<{ table: TableKey; query: string }>) => {
      state[action.payload.table].query = action.payload.query
      state[action.payload.table].page = 1
    },
    setInventoryPage: (state, action: PayloadAction<{ table: TableKey; page: number }>) => {
      state[action.payload.table].page = Math.max(1, action.payload.page)
    },
    updateProductStatusLocally: (state, action: PayloadAction<{ id: string | number; status: 'active' | 'inactive' }>) => {
      const item = state.products.items.find((p) => String(p.id) === String(action.payload.id))
      if (item) item.status = action.payload.status
    },
    updateProductPricesLocally: (state, action: PayloadAction<{ id: string | number; prices: ProductPrices }>) => {
      const item = state.products.items.find((p) => String(p.id) === String(action.payload.id))
      if (item) item.prices = action.payload.prices
    },
    updateProductLocally: (state, action: PayloadAction<Product>) => {
      const idx = state.products.items.findIndex((p) => String(p.id) === String(action.payload.id))
      if (idx !== -1) state.products.items[idx] = action.payload
    },
    // tiempo real (stock.changed): actualiza por stockId las filas que ya están en memoria (tabla de stock y detalle del producto); las demás se ignoran
    stockRowsChanged: (state, action: PayloadAction<StockRowChange[]>) => {
      for (const row of action.payload) {
        const table = state.stock.items.find((item) => item.id === row.stockId)
        if (table && isNewer(row.version, table.version)) {
          table.available = row.available
          table.reserved = row.reserved
          table.sellable = row.sellable
          table.minStock = row.minStock
          table.location = row.location || table.location
          table.level = stockLevelOf(row.sellable, row.minStock)
          table.version = row.version
        }
        const detail = state.productStock.items.find((item) => item.stockId === row.stockId)
        if (detail && isNewer(row.version, detail.version)) {
          detail.available = row.available
          detail.reserved = row.reserved
          detail.sellable = row.sellable
          detail.minStock = row.minStock
          detail.location = row.location || detail.location
          detail.version = row.version
        }
      }
    },
    // tiempo real (entity.status_changed kind=product): la fila del producto cambia de estado si ya está en la tabla
    productStatusFromEvent: (state, action: PayloadAction<{ id: number; status: 'active' | 'inactive'; version: string }>) => {
      const item = state.products.items.find((p) => String(p.id) === String(action.payload.id))
      if (item && isNewer(action.payload.version, item.updatedAt)) {
        item.status = action.payload.status
        item.updatedAt = action.payload.version
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProductStockThunk.pending, (state, action) => {
        state.productStock = { productId: action.meta.arg, items: [], status: 'loading', error: null, requestId: action.meta.requestId }
      })
      .addCase(loadProductStockThunk.fulfilled, (state, action) => {
        if (state.productStock.requestId !== action.meta.requestId) return
        state.productStock.items = action.payload
        state.productStock.status = 'succeeded'
      })
      .addCase(loadProductStockThunk.rejected, (state, action) => {
        if (state.productStock.requestId !== action.meta.requestId) return
        state.productStock.status = 'failed'
        state.productStock.error = action.payload ?? 'Error al consultar existencias.'
      })
      .addCase(saveProductPricesThunk.fulfilled, (state, action) => {
        const item = state.products.items.find((p) => String(p.id) === String(action.payload.id))
        if (item) item.prices = action.payload.prices
      })
      .addCase(loadProductsTableThunk.pending, (state, action) => {
        state.products.status = 'loading'
        state.products.error = null
        state.products.requestId = action.meta.requestId
      })
      .addCase(loadProductsTableThunk.fulfilled, (state, action) => {
        if (state.products.requestId !== action.meta.requestId) return
        state.products.items = action.payload.items
        state.products.meta = action.payload.meta
        state.products.status = 'succeeded'
      })
      .addCase(loadProductsTableThunk.rejected, (state, action) => {
        if (state.products.requestId !== action.meta.requestId) return
        state.products.status = 'failed'
        state.products.error = action.payload ?? 'No se pudieron cargar los productos.'
      })
      .addCase(loadStockTableThunk.pending, (state, action) => {
        state.stock.status = 'loading'
        state.stock.error = null
        state.stock.requestId = action.meta.requestId
      })
      .addCase(loadStockTableThunk.fulfilled, (state, action) => {
        if (state.stock.requestId !== action.meta.requestId) return
        state.stock.items = action.payload.items
        state.stock.meta = action.payload.meta
        state.stock.status = 'succeeded'
      })
      .addCase(loadStockTableThunk.rejected, (state, action) => {
        if (state.stock.requestId !== action.meta.requestId) return
        state.stock.status = 'failed'
        state.stock.error = action.payload ?? 'No se pudo cargar el stock.'
      })
      .addMatcher(isAnyOf(setActiveWarehouse, logoutThunk.fulfilled), () => INITIAL_INVENTORY_STATE)
  },
})

export const {
  countEventReceived,
  productPricesFromEvent,
  setInventoryQuery,
  setInventoryPage,
  updateProductStatusLocally,
  updateProductPricesLocally,
  updateProductLocally,
  stockRowsChanged,
  productStatusFromEvent,
} = inventorySlice.actions
export const inventoryReducer = inventorySlice.reducer
export default inventorySlice.reducer
