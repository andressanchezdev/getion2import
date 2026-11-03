// transfers.slice.test · pruebas del estado de traslados: cargas con requestId, filas que cambian al despachar o recibir, y vaciado al cerrar sesión
// conecta con: transfers.slice y transfers.thunks (solo se usan sus tipos de acción); se corre con npm test
import { describe, expect, it } from 'vitest'
import { logoutThunk } from '@/features/auth'
import { INITIAL_TRANSFERS_STATE } from '../constants/transfers.constants'
import { transfersReducer } from './transfers.slice'
import { acceptTransferThunk, dispatchTransferThunk, loadTransfersThunk, loadWarehouseStockThunk, searchTransferProductsThunk } from '../thunks/transfers.thunks'
import type { TrasladeItem } from '../types/transfers.types'

const transfer = (id: number, status: TrasladeItem['status'] = 'pending'): TrasladeItem => ({
  id,
  serialCode: `TR-${id}`,
  type: 'inter_warehouse',
  typeLabel: 'Solicitud entre bodegas',
  status,
  priority: 'normal',
  originWarehouse: { id: 1, name: 'Principal' },
  destWarehouse: { id: 2, name: 'Norte' },
  products: [],
})

const loaded = (items: TrasladeItem[]) => {
  const pending = loadTransfersThunk.pending('req-1', 1)
  const state = transfersReducer(INITIAL_TRANSFERS_STATE, pending)
  return transfersReducer(state, loadTransfersThunk.fulfilled(items, 'req-1', 1))
}

describe('transfers.slice', () => {
  it('al pedir la lista queda cargando y al llegar guarda los traslados', () => {
    const pending = transfersReducer(INITIAL_TRANSFERS_STATE, loadTransfersThunk.pending('req-1', 1))
    expect(pending.list.status).toBe('loading')
    const state = loaded([transfer(1), transfer(2)])
    expect(state.list.status).toBe('succeeded')
    expect(state.list.items.map((item) => item.id)).toEqual([1, 2])
  })

  it('descarta la respuesta de un pedido anterior', () => {
    let state = transfersReducer(INITIAL_TRANSFERS_STATE, loadTransfersThunk.pending('viejo', 1))
    state = transfersReducer(state, loadTransfersThunk.pending('nuevo', 1))
    state = transfersReducer(state, loadTransfersThunk.fulfilled([transfer(9)], 'viejo', 1))
    expect(state.list.items).toEqual([])
    expect(state.list.status).toBe('loading')
  })

  it('si falla guarda el mensaje', () => {
    let state = transfersReducer(INITIAL_TRANSFERS_STATE, loadTransfersThunk.pending('r', 1))
    state = transfersReducer(state, loadTransfersThunk.rejected(null, 'r', 1, 'No se pudieron cargar los traslados.'))
    expect(state.list.status).toBe('failed')
    expect(state.list.error).toBe('No se pudieron cargar los traslados.')
  })

  it('las existencias y el buscador llevan su propio estado', () => {
    let state = transfersReducer(INITIAL_TRANSFERS_STATE, loadWarehouseStockThunk.pending('s', { warehouseId: 1, query: '' }))
    state = transfersReducer(state, loadWarehouseStockThunk.rejected(null, 's', { warehouseId: 1, query: '' }, 'Sin stock'))
    expect(state.stock).toMatchObject({ status: 'failed', error: 'Sin stock', items: [] })
    state = transfersReducer(state, searchTransferProductsThunk.pending('b', 'pas'))
    expect(state.search.status).toBe('loading')
    expect(state.list.status).toBe('idle')
  })

  it('despachar pasa la fila a «en tránsito»', () => {
    const state = transfersReducer(loaded([transfer(1), transfer(2)]), dispatchTransferThunk.fulfilled(1, 'd', 1))
    expect(state.list.items.map((item) => item.status)).toEqual(['in_transit', 'pending'])
  })

  it('recibir sin novedad pasa a «received» y con novedad a «with_novelty» con su texto', () => {
    const base = loaded([transfer(1, 'in_transit'), transfer(2, 'in_transit')])
    const ok = transfersReducer(base, acceptTransferThunk.fulfilled({ id: 1 }, 'a', { transfer: transfer(1) }))
    expect(ok.list.items[0].status).toBe('received')
    const novelty = transfersReducer(ok, acceptTransferThunk.fulfilled({ id: 2, noveltyNotes: 'Llegó una caja rota' }, 'b', { transfer: transfer(2) }))
    expect(novelty.list.items[1]).toMatchObject({ status: 'with_novelty', noveltyNotes: 'Llegó una caja rota' })
  })

  it('al cerrar sesión se vacía todo', () => {
    const state = transfersReducer(loaded([transfer(1)]), logoutThunk.fulfilled(undefined, 'l', 'manual'))
    expect(state).toEqual(INITIAL_TRANSFERS_STATE)
  })
})
