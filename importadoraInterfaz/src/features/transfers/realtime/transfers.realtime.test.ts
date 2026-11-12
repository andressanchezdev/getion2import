// transfers.realtime.test · evento → estado esperado en traslados: creación, cambio de estado, stock y producto inactivo en el borrador
// conecta con: transfers.slice y transfers.adapter; no hay red ni store de la app
import { describe, expect, it } from 'vitest'
import { INITIAL_TRANSFERS_STATE } from '../constants/transfers.constants'
import { toTransferFromEvent } from '../helpers/transfers.adapter'
import {
  transferEntityStatusFromEvent,
  transferStatusFromEvent,
  transferUpsertedFromEvent,
  transfersReducer,
  warehouseStockFromEvent,
} from '../slices/transfers.slice'
import type { TransferRow } from '@/features/realtime'

const row: TransferRow = {
  id: 42,
  serial: 'TR-000042',
  status: 'pending',
  isPriority: false,
  notes: null,
  originWarehouseId: 7,
  destinationWarehouseId: 9,
  lines: [{ lineId: 1, productId: 88, productCode: 'REP-88', productName: 'Pastillas', quantity: 6, receivedQty: 0, destinationLocation: '' }],
  createdBy: { type: 'employee', id: 18, name: 'Luis' },
  createdAt: '2026-11-12T10:00:00.000000Z',
  version: '2026-11-12T10:00:00.000000Z',
}

const withTransfer = () => transfersReducer(INITIAL_TRANSFERS_STATE, transferUpsertedFromEvent({ transfer: toTransferFromEvent(row) }))

describe('transfers realtime', () => {
  it('transfer.created agrega la fila con su serial y sus líneas', () => {
    const state = withTransfer()
    expect(state.list.items[0]).toMatchObject({ id: 42, serialCode: 'TR-000042', status: 'pending', originWarehouse: { id: 7 }, destWarehouse: { id: 9 } })
    expect(state.list.items[0].products[0]).toMatchObject({ itemId: 1, productId: 88, quantity: 6 })
  })

  it('transfer.created de otra bodega distinta a la activa se ignora', () => {
    const state = transfersReducer(INITIAL_TRANSFERS_STATE, transferUpsertedFromEvent({ transfer: toTransferFromEvent(row), activeWarehouseId: 3 }))
    expect(state.list.items).toEqual([])
  })

  it('transfer.status_changed más nuevo actualiza estado, receptor y novedad', () => {
    const state = transfersReducer(
      withTransfer(),
      transferStatusFromEvent({
        transferId: 42,
        version: '2026-11-12T10:05:00.000000Z',
        to: 'with_novelty',
        lines: [],
        noveltyNotes: 'Llegaron 4 de 6',
        cancelReason: null,
        dispatchedBy: null,
        receivedBy: { id: 30, name: 'Carlos' },
      })
    )
    expect(state.list.items[0]).toMatchObject({ status: 'with_novelty', noveltyNotes: 'Llegaron 4 de 6', receivedByEmployeeName: 'Carlos', priority: 'high' })
  })

  it('transfer.status_changed igual o más viejo no se aplica', () => {
    const state = transfersReducer(
      withTransfer(),
      transferStatusFromEvent({ transferId: 42, version: row.version, to: 'cancelled', lines: [], noveltyNotes: null, cancelReason: 'x', dispatchedBy: null, receivedBy: null })
    )
    expect(state.list.items[0].status).toBe('pending')
  })

  it('transfer.status_changed de un traslado que no está en memoria se ignora', () => {
    const state = transfersReducer(
      INITIAL_TRANSFERS_STATE,
      transferStatusFromEvent({ transferId: 99, version: row.version, to: 'in_transit', lines: [], noveltyNotes: null, cancelReason: null, dispatchedBy: null, receivedBy: null })
    )
    expect(state.list.items).toEqual([])
  })

  it('stock.changed ajusta el tope de la línea del borrador', () => {
    const base = {
      ...INITIAL_TRANSFERS_STATE,
      draft: { destWarehouseId: 9, lines: [{ productId: 88, code: 'REP-88', description: 'P', originWarehouseId: 7, originWarehouseName: 'Principal', quantity: 6, max: 10 }] },
    }
    const state = transfersReducer(base, warehouseStockFromEvent({ rows: [], totals: [{ productId: 88, warehouseId: 7, available: 5, reserved: 0, sellable: 4 }] }))
    expect(state.draft.lines[0].max).toBe(4)
  })

  it('un producto que pasa a inactivo marca su línea del borrador como no disponible', () => {
    const base = {
      ...INITIAL_TRANSFERS_STATE,
      draft: { destWarehouseId: 9, lines: [{ productId: 88, code: 'REP-88', description: 'P', originWarehouseId: 7, originWarehouseName: 'Principal', quantity: 2, max: 10 }] },
    }
    const state = transfersReducer(base, transferEntityStatusFromEvent({ kind: 'product', id: 88, to: 'inactive' }))
    expect(state.draft.lines[0].unavailable).toBe(true)
  })
})

