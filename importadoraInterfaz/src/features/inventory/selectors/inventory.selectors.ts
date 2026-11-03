// inventory.selectors · lecturas de las tablas de inventario
// conecta con: inventory.slice (estado), useProductsTable y useStockTable
import type { InventoryState } from '../types/inventory.types'

type InventoryRootState = { inventory: InventoryState }

export const selectProductsTable = (state: InventoryRootState) => state.inventory.products
// lee la tabla de stock de la bodega activa (filas, página y búsqueda)
export const selectStockTable = (state: InventoryRootState) => state.inventory.stock

// lee las existencias del producto abierto en todas las bodegas
export const selectProductStock = (state: { inventory: InventoryState }) => state.inventory.productStock
