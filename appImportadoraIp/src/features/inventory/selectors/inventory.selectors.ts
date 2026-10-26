// inventory.selectors · lecturas del estado del control de inventario
// conecta con: ProductControlScreen y useInventoryLoader; leen state.inventory
import type { InventoryState } from '../types/inventory.types'

type InventoryRootState = { inventory: InventoryState }

export const selectInventory = (state: InventoryRootState) => state.inventory
