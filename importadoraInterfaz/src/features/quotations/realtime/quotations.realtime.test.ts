// quotations.realtime.test · el estado y las notas de una cotización cambian por evento en la lista y en el detalle
import { describe, expect, it } from 'vitest'
import { INITIAL_QUOTATIONS_STATE } from '../constants/quotations.constants'
import { quotationsReducer, quotationStatusFromEvent, quotationUpdatedFromEvent } from '../slices/quotations.slice'
import type { Quotation } from '../types/quotations.types'

const quotation: Quotation = { id: 3, serialCode: 'COT-3', customerId: 4, customerName: 'Ana', whatsapp: '', employeeName: 'Pedro', status: 'draft', total: 50000, notes: '', createdAt: '2026-11-12', items: [] }
const loaded = { ...INITIAL_QUOTATIONS_STATE, list: { ...INITIAL_QUOTATIONS_STATE.list, items: [quotation] }, detail: { id: 3, data: quotation, status: 'succeeded' as const, error: null } }

describe('cotizaciones en tiempo real', () => {
  it('quotation.status_changed cambia la fila y el detalle', () => {
    const state = quotationsReducer(loaded, quotationStatusFromEvent({ id: 3, to: 'converted' }))
    expect(state.list.items[0].status).toBe('converted')
    expect(state.detail.data?.status).toBe('converted')
  })
  it('quotation.updated cambia las notas; otra cotización no se toca', () => {
    expect(quotationsReducer(loaded, quotationUpdatedFromEvent({ id: 3, notes: 'Entrega el lunes' })).list.items[0].notes).toBe('Entrega el lunes')
    expect(quotationsReducer(loaded, quotationUpdatedFromEvent({ id: 9, notes: 'x' })).list.items[0].notes).toBe('')
  })
})
