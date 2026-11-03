// inventory.slice · estado de las tablas de inventario: productos y stock (items, página, búsqueda, estado de carga y error)
// conecta con: inventory.thunks (lo llenan), inventory.selectors (lecturas), navigation (al cambiar de bodega se vacía) y rootReducer (clave 'inventory'; NO se guarda en el navegador)
// ojo: se vacía al cambiar de bodega (los números son de esa bodega) y al cerrar sesión; al saltar de compañía rootReducer lo reinicia
import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { setActiveWarehouse } from '@/features/navigation'
import type { Product, ProductPrices } from '@/features/shop'
import { INITIAL_INVENTORY_STATE } from '../constants/inventory.constants'
import { loadProductStockThunk, loadProductsTableThunk, loadStockTableThunk, saveProductPricesThunk } from '../thunks/inventory.thunks'

type TableKey = 'products' | 'stock'

export const inventorySlice = createSlice({
  name: 'inventory',
  initialState: INITIAL_INVENTORY_STATE,
  reducers: {
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
  setInventoryQuery,
  setInventoryPage,
  updateProductStatusLocally,
  updateProductPricesLocally,
  updateProductLocally,
} = inventorySlice.actions
export const inventoryReducer = inventorySlice.reducer
export default inventorySlice.reducer
