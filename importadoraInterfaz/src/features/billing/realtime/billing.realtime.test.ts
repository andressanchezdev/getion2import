// billing.realtime.test · el consecutivo avanza con el serial del evento, solo en su bodega y nunca retrocede
import { describe, expect, it } from 'vitest'
import { INITIAL_BILLING_STATE } from '../constants/billing.constants'
import { billingReducer, docSeriesUsedFromEvent } from '../slices/billing.slice'

const base = { ...INITIAL_BILLING_STATE, warehouseId: 7, series: [{ id: 1, warehouseId: 7, docType: 'invoice' as const, prefix: 'FV-B7', nextNumber: 120 }] }

describe('docSeriesUsedFromEvent', () => {
  it('avanza al número siguiente del serial usado', () => {
    const state = billingReducer(base, docSeriesUsedFromEvent({ docType: 'invoice', warehouseIds: [7], serial: 'FV-B7-124' }))
    expect(state.series[0].nextNumber).toBe(125)
  })
  it('no retrocede con un evento viejo ni cambia con otra bodega u otro tipo', () => {
    expect(billingReducer(base, docSeriesUsedFromEvent({ docType: 'invoice', warehouseIds: [7], serial: 'FV-B7-90' })).series[0].nextNumber).toBe(120)
    expect(billingReducer(base, docSeriesUsedFromEvent({ docType: 'invoice', warehouseIds: [8], serial: 'FV-B8-500' })).series[0].nextNumber).toBe(120)
    expect(billingReducer(base, docSeriesUsedFromEvent({ docType: 'sale', warehouseIds: [7], serial: 'PED-B7-500' })).series[0].nextNumber).toBe(120)
  })
})
