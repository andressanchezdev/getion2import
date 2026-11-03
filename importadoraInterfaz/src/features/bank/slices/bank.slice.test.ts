// bank.slice.test · pruebas del estado de la conciliación bancaria: arranca vacío, los filtros vuelven a la página 1 y una respuesta vieja no pisa a la nueva
// conecta con: bank.slice, bank.thunks y bank.constants; no usa red (las acciones se simulan)
import { describe, expect, it } from 'vitest'
import { INITIAL_BANK_FILTERS, INITIAL_BANK_STATE } from '../constants/bank.constants'
import { bankReducer, clearBankFilters, setBankFilters, setBankPage } from './bank.slice'
import { loadBankRecordsThunk, uploadBankStatementThunk } from '../thunks/bank.thunks'

const meta = { currentPage: 1, pageSize: 20, totalRecords: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }
const record = { id: 1, bank: '', account: '', date: '2026-10-28', description: 'PAGO', channel: '', reference: '', document: '', amount: 10, isIncome: true, status: 'pending' as const, confirmedBy: '', confirmedAt: '', notes: '' }

describe('bank.slice', () => {
  it('arranca vacío: sin movimientos de ejemplo', () => {
    expect(INITIAL_BANK_STATE.list.items).toEqual([])
    expect(INITIAL_BANK_STATE.list.meta).toBeNull()
    expect(INITIAL_BANK_STATE.upload.result).toBeNull()
  })

  it('cambiar un filtro vuelve a la página 1 y limpiar los deja como al inicio', () => {
    let state = bankReducer(INITIAL_BANK_STATE, setBankPage(4))
    state = bankReducer(state, setBankFilters({ status: 'confirmed' }))
    expect(state.list.page).toBe(1)
    expect(state.list.filters.status).toBe('confirmed')
    state = bankReducer(state, clearBankFilters())
    expect(state.list.filters).toEqual(INITIAL_BANK_FILTERS)
  })

  it('guarda la lista que llega y descarta la respuesta de un pedido anterior', () => {
    let state = bankReducer(INITIAL_BANK_STATE, loadBankRecordsThunk.pending('req-2'))
    state = bankReducer(state, loadBankRecordsThunk.fulfilled({ items: [{ ...record, id: 99 }], meta }, 'req-1'))
    expect(state.list.items).toEqual([])
    state = bankReducer(state, loadBankRecordsThunk.fulfilled({ items: [record], meta }, 'req-2'))
    expect(state.list.items).toHaveLength(1)
    expect(state.list.status).toBe('succeeded')
  })

  it('guarda lo que dijo la subida del PDF y su error si falla', () => {
    const file = new File(['%PDF'], 'x.pdf')
    let state = bankReducer(INITIAL_BANK_STATE, uploadBankStatementThunk.pending('u1', file))
    expect(state.upload.status).toBe('loading')
    state = bankReducer(state, uploadBankStatementThunk.fulfilled({ processed: 5, inserted: 3, account: 'Cta' }, 'u1', file))
    expect(state.upload.result).toEqual({ processed: 5, inserted: 3, account: 'Cta' })
    state = bankReducer(state, uploadBankStatementThunk.rejected(null, 'u2', file, 'El PDF no se pudo leer'))
    expect(state.upload).toMatchObject({ status: 'failed', error: 'El PDF no se pudo leer', result: null })
  })
})
