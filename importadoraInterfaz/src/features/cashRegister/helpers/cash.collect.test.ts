// cash.collect.test · pruebas de las reglas del cobro mixto: lo que falta, cuándo se ofrece cobrar, validación de líneas y lo que se envía
// conecta con: cash.collect; se corre con npm test
import { describe, expect, it } from 'vitest'
import { canCollect, collectProblem, emptyLine, lineProblem, remainingOf, sumLines, toCollectInput } from './cash.collect'
import type { CollectLine } from '../types/cash.types'

const line = (over: Partial<CollectLine>): CollectLine => ({ ...emptyLine(100_000), ...over })

describe('remainingOf y canCollect', () => {
  it('falta lo que no está verificado ni dejado a crédito, nunca negativo', () => {
    expect(remainingOf({ totalAmount: 500_000, paidAmount: 100_000, creditAmount: 150_000 })).toBe(250_000)
    expect(remainingOf({ totalAmount: 100_000, paidAmount: 100_000, creditAmount: 50_000 })).toBe(0)
  })

  it('se ofrece cobrar si no está cubierto y no es un pedido por transferencia', () => {
    expect(canCollect({ paymentMethod: 'cash', paymentVerified: false })).toBe(true)
    expect(canCollect({ paymentMethod: 'credit', paymentVerified: false })).toBe(true)
    expect(canCollect({ paymentMethod: 'cash', paymentVerified: true })).toBe(false)
    expect(canCollect({ paymentMethod: 'Transfer', paymentVerified: false })).toBe(false)
  })
})

describe('lineProblem y collectProblem', () => {
  it('el efectivo exige turno abierto', () => {
    expect(lineProblem(line({}), true)).toBeNull()
    expect(lineProblem(line({}), false)).toMatch(/turno/)
  })

  it('la transferencia exige referencia y foto', () => {
    expect(lineProblem(line({ method: 'transfer' }), true)).toMatch(/referencia/)
    expect(lineProblem(line({ method: 'transfer', reference: 'R1' }), true)).toMatch(/foto/)
    expect(lineProblem(line({ method: 'transfer', reference: 'R1', proofUrl: 'data:x' }), true)).toBeNull()
  })

  it('el crédito no pide comprobante ni turno y un monto en cero se rechaza', () => {
    expect(lineProblem(line({ method: 'credit' }), false)).toBeNull()
    expect(lineProblem(line({ amount: 0 }), true)).toMatch(/monto/)
  })

  it('el cobro no puede pasar de lo que falta ni ir vacío', () => {
    expect(collectProblem([], 100_000, true)).toMatch(/al menos/)
    expect(collectProblem([line({ amount: 120_000 })], 100_000, true)).toMatch(/superan/)
    expect(collectProblem([line({ amount: 60_000 }), line({ method: 'credit', amount: 40_000 })], 100_000, true)).toBeNull()
  })
})

describe('toCollectInput', () => {
  it('arma las líneas: transferencia con referencia, banco y foto; efectivo y crédito sin extras', () => {
    const lines = [line({ amount: 50_000 }), line({ method: 'transfer', amount: 30_000, reference: ' R9 ', bank: ' Nequi ', proofUrl: 'data:img' }), line({ method: 'credit', amount: 20_000 })]
    expect(sumLines(lines)).toBe(100_000)
    expect(toCollectInput(7, lines)).toEqual({
      saleId: 7,
      payments: [
        { method: 'cash', amount: 50_000 },
        { method: 'transfer', amount: 30_000, reference: 'R9', proofUrl: 'data:img', bank: 'Nequi' },
        { method: 'credit', amount: 20_000 },
      ],
    })
  })
})
