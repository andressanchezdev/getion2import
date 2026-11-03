// inventory.thunks · carga la tabla de productos y la tabla de stock de la bodega activa
// conecta con: inventory.service (stock), shop (productos y búsqueda), auth (selectRequestContext) y la bodega activa; las despachan useProductsTable y useStockTable
// ojo: cada carga lleva su requestId y el slice descarta las respuestas de cargas anteriores; sin bodega activa no se pide nada
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage, paginateList, type Paginated } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import { fetchProductsPage, searchProducts, createProduct, toWarehouseNumber, updateProductDetails, updateProductPrices, type NewProductInput, type Product, type ProductPrices } from '@/features/shop'
import { CATALOG_SEARCH_LIMIT, INVENTORY_PAGE_SIZE, INVENTORY_SEARCH_LIMIT } from '../constants/inventory.constants'
import { assignStock, fetchProductStock, fetchStockPage, relocateStock, type AssignStockPayload, type RelocateStockPayload } from '../services/inventory.service'
import type { StockFullDto } from '../types/inventory.api.types'
import type { InventoryStockRow } from '../types/inventory.types'

type ThunkConfig = { state: { auth: AuthState; ui: { activeWarehouseId: string; activeCompanyId?: number } }; rejectValue: string }
const NO_SESSION = 'No hay una sesión activa.'
const NO_WAREHOUSE = 'Elige una bodega para ver su stock.'

interface TableArg {
  page: number
  query: string
  location?: string // solo la tabla de existencias: una ubicación de la bodega
}

export const loadProductsTableThunk = createAsyncThunk<Paginated<Product>, TableArg, ThunkConfig>('inventory/loadProducts', async ({ page, query }, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  try {
    if (query.trim()) {
      const found = await searchProducts(ctx, query.trim(), INVENTORY_SEARCH_LIMIT, warehouseId, true)
      return paginateList(found, page, INVENTORY_PAGE_SIZE)
    }
    return await fetchProductsPage(ctx, { page, pageSize: INVENTORY_PAGE_SIZE, warehouseId, includeInactive: true })
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los productos.'))
  }
})

export const loadStockTableThunk = createAsyncThunk<Paginated<InventoryStockRow>, TableArg, ThunkConfig>('inventory/loadStock', async ({ page, query, location }, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  const warehouseId = toWarehouseNumber(state.ui.activeWarehouseId)
  if (!warehouseId) return rejectWithValue(NO_WAREHOUSE)
  try {
    return await fetchStockPage(ctx, warehouseId, page, query, location)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el stock.'))
  }
})

// mueve existencias a otra ubicación de la misma bodega; quien la despacha recarga su tabla al terminar
export const relocateStockThunk = createAsyncThunk<void, RelocateStockPayload, { rejectValue: string }>('inventory/relocate', async (payload, { rejectWithValue }) => {
  try {
    await relocateStock(payload)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Error al reubicar el producto.'))
  }
})

// existencias de un producto en todas las bodegas; la respuesta lleva el productId para que el slice no mezcle las de otro producto
export const loadProductStockThunk = createAsyncThunk<StockFullDto[], number, ThunkConfig>('inventory/loadProductStock', async (productId, { getState, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await fetchProductStock(ctx, productId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Error al consultar existencias.'))
  }
})

// guarda las 4 tarifas de un producto; devuelve lo guardado para que el slice actualice la fila de la tabla
export const saveProductPricesThunk = createAsyncThunk<{ id: string | number; prices: ProductPrices }, { id: string | number; prices: ProductPrices }, { rejectValue: string }>(
  'inventory/savePrices',
  async ({ id, prices }, { rejectWithValue }) => {
    try {
      await updateProductPrices(id, prices)
      return { id, prices }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Error al actualizar precios'))
    }
  }
)

// guarda los datos básicos de un producto (nombre, código, descripción, estado, categoría y nuevo)
export const saveProductDetailsThunk = createAsyncThunk<void, { id: string | number; updates: Parameters<typeof updateProductDetails>[1] }, { rejectValue: string }>(
  'inventory/saveDetails',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      await updateProductDetails(id, updates)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Error al actualizar el producto.'))
    }
  }
)

// crea un producto (con su ubicación inicial si se eligió) y devuelve el producto creado
export const createProductThunk = createAsyncThunk<Product, NewProductInput, { rejectValue: string }>('inventory/createProduct', async (input, { rejectWithValue }) => {
  try {
    return await createProduct(input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo crear el producto.'))
  }
})

// pone un producto del catálogo en una ubicación de la bodega; quien la despacha recarga su tabla al terminar
export const assignStockThunk = createAsyncThunk<void, AssignStockPayload, { rejectValue: string }>('inventory/assign', async (payload, { rejectWithValue }) => {
  try {
    await assignStock(payload)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo asignar el producto a la ubicación.'))
  }
})

// busca productos del catálogo de la compañía para elegir uno (no se guarda en el estado: quien la despacha usa el resultado)
export const searchCatalogThunk = createAsyncThunk<Product[], string, ThunkConfig>('inventory/searchCatalog', async (text, { getState, rejectWithValue }) => {
  const state = getState()
  const ctx = selectRequestContext(state)
  if (!ctx) return rejectWithValue(NO_SESSION)
  try {
    return await searchProducts(ctx, text.trim(), CATALOG_SEARCH_LIMIT, toWarehouseNumber(state.ui.activeWarehouseId), true)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo buscar en el catálogo.'))
  }
})
