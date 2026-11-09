// quotationDraft.test — el renglón de la cotización toma el precio del nivel elegido y nunca baja de una unidad
// conecta con: quotationDraft; se corre con npm test
import { describe, expect, it } from 'vitest'
import type { Product } from '@/features/shop'
import { quotationDraftReducer, addDraftLine, removeDraftLine, setDraftQuantity } from '../slices/quotationDraft.slice'
import { toDraftLine } from './quotationDraft'

const product = { id: '7', code: 'AP-1', name: 'Aceite', category: 'Lubricantes', brand: 'Bajaj', prices: { p0: 1000, p1: 900, p2: 800, p3: 700 }, iva: 19 } as unknown as Product

describe('toDraftLine', () => {
  it('toma el precio del nivel elegido y el IVA del producto', () => {
    const line = toDraftLine(product, 3, 'P1')
    expect(line).toMatchObject({ productId: 7, code: 'AP-1', quantity: 3, unitPrice: 900, ivaPercent: 19 })
  })
  it('la cantidad nunca baja de una unidad', () => {
    expect(toDraftLine(product, 0, 'P0').quantity).toBe(1)
    expect(toDraftLine(product, -4, 'P0').quantity).toBe(1)
  })
})

describe('quotationDraft slice', () => {
  it('suma la cantidad si el producto ya estaba y permite quitarlo', () => {
    let state = quotationDraftReducer(undefined, addDraftLine(toDraftLine(product, 1, 'P0')))
    state = quotationDraftReducer(state, addDraftLine(toDraftLine(product, 2, 'P0')))
    expect(state.lines).toHaveLength(1)
    expect(state.lines[0].quantity).toBe(3)
    state = quotationDraftReducer(state, setDraftQuantity({ productId: 7, quantity: 10 }))
    expect(state.lines[0].quantity).toBe(10)
    state = quotationDraftReducer(state, removeDraftLine(7))
    expect(state.lines).toHaveLength(0)
  })
})
