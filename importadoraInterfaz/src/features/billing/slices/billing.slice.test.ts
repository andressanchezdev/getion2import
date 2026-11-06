// billing.slice.test · el estado de facturación: facturas, datos fiscales y series por bodega, y guardar una serie
// conecta con: billing.slice y billing.thunks; se corre con npm test
import { describe, expect, it } from 'vitest'
import { INITIAL_BILLING_STATE } from '../constants/billing.constants'
import { loadBillingSettingsThunk, loadInvoicesThunk, saveBillingConfigThunk, saveDocSeriesThunk } from '../thunks/billing.thunks'
import { billingReducer } from './billing.slice'
import type { BillingConfig, DocSeries, Invoice } from '../types/billing.types'

const invoice: Invoice = { id: 1, number: 'FE-000001', kind: 'invoice', status: 'issued', saleId: 4, saleSerial: 'PED-0004', warehouseName: 'Principal', employeeName: 'Ana', issuedAt: '2026-11-01', pdfUrl: '', warnings: [] }
const config: BillingConfig = {
  id: 1, warehouseId: 1, typeFacturation: 'juridica', documentType: 'NIT', nit: '900', legalName: 'Premium', tradeName: '', billingEmail: '', billingPhone: '', billingAddress: '', billingCity: '', vatWithholder: false, incomeWithholder: false, selfWithholder: false,
  invoicePrefix: 'FE', resolutionNumber: '', resolutionDate: '', resolutionValidUntil: '', rangeFrom: 1, rangeTo: 5000, isActive: true,
}
const series = (id: number, nextNumber: number): DocSeries => ({ id, warehouseId: 1, docType: 'invoice', prefix: 'FE-', nextNumber })

describe('billing.slice', () => {
  it('carga las facturas y descarta una respuesta vieja', () => {
    let state = billingReducer(INITIAL_BILLING_STATE, loadInvoicesThunk.pending('a', 1))
    state = billingReducer(state, loadInvoicesThunk.pending('b', 1))
    state = billingReducer(state, loadInvoicesThunk.fulfilled([invoice], 'a', 1))
    expect(state.invoices).toEqual([])
    state = billingReducer(state, loadInvoicesThunk.fulfilled([invoice], 'b', 1))
    expect(state).toMatchObject({ invoicesStatus: 'succeeded', warehouseId: 1 })
  })

  it('al cambiar de bodega se vacían facturas, datos fiscales y series', () => {
    let state = billingReducer(INITIAL_BILLING_STATE, loadBillingSettingsThunk.pending('a', 1))
    state = billingReducer(state, loadBillingSettingsThunk.fulfilled({ config, series: [series(1, 2)] }, 'a', 1))
    expect(state.config).toEqual(config)
    state = billingReducer(state, loadInvoicesThunk.pending('b', 2))
    expect(state).toMatchObject({ config: null, series: [], warehouseId: 2 })
  })

  it('guardar una serie cambia solo esa fila', () => {
    let state = billingReducer(INITIAL_BILLING_STATE, loadBillingSettingsThunk.pending('a', 1))
    state = billingReducer(state, loadBillingSettingsThunk.fulfilled({ config, series: [series(1, 2), series(2, 7)] }, 'a', 1))
    state = billingReducer(state, saveDocSeriesThunk.pending('c', { seriesId: 1, prefix: 'FE-', nextNumber: 50 }))
    expect(state.saving).toBe(true)
    state = billingReducer(state, saveDocSeriesThunk.fulfilled(series(1, 50), 'c', { seriesId: 1, prefix: 'FE-', nextNumber: 50 }))
    expect(state.saving).toBe(false)
    expect(state.series.map((item) => item.nextNumber)).toEqual([50, 7])
  })

  it('guardar los datos fiscales los reemplaza y un error suelta el «guardando»', () => {
    let state = billingReducer(INITIAL_BILLING_STATE, saveBillingConfigThunk.pending('d', { warehouseId: 1, input: {} }))
    state = billingReducer(state, saveBillingConfigThunk.fulfilled(config, 'd', { warehouseId: 1, input: {} }))
    expect(state).toMatchObject({ config, saving: false })
    state = billingReducer(state, saveBillingConfigThunk.pending('e', { warehouseId: 1, input: {} }))
    state = billingReducer(state, saveBillingConfigThunk.rejected(null, 'e', { warehouseId: 1, input: {} }, 'Sin conexión'))
    expect(state.saving).toBe(false)
  })
})
