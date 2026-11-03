// transfers.selectors · lecturas del estado de traslados
// conecta con: transfers.slice (estado), TransfersScreen, WarehouseProductsTable y los hooks de la feature
import type { TransfersState } from '../types/transfers.types'

type TransfersRootState = { transfers: TransfersState }

export const selectTransfersList = (state: TransfersRootState) => state.transfers.list
// lee las existencias de la bodega de la pestaña «Repuestos en sede»
export const selectWarehouseStock = (state: TransfersRootState) => state.transfers.stock
// lee los resultados del buscador de productos del nuevo traslado
export const selectTransferProductSearch = (state: TransfersRootState) => state.transfers.search
