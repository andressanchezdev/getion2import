// orders.actions.test · qué acción de etapa ofrece cada pedido según su etapa real, igual que las reglas de Go
import { describe, expect, it } from 'vitest'
import { getOrderActions, nextStageAction } from './orders.actions'
import type { OrderRow } from '../types/orders.types'

const order = (currentStage: string): OrderRow => ({
  id: 1, serial: 'PED-1', stage: 'verification', channel: 'standard', customerName: 'Ana', sellerName: 'Luis', paymentMethod: 'cash', totalAmount: 1000,
  createdAt: '2026-01-01', paused: false, paymentVerified: true, locationVerified: false, paidAmount: 1000, creditAmount: 0, confirmed: false, currentStage,
})

describe('nextStageAction', () => {
  const cases: Array<[string, string | null]> = [
    ['verification', null], // espera el pago
    ['verification_ok', 'pick'],
    ['picking', 'pack'],
    ['picking_ok', 'pack'],
    ['packing', 'invoice'],
    ['packing_ok', 'invoice'],
    ['invoicing', 'dispatch'],
    ['invoicing_ok', 'dispatch'],
    ['dispatch', 'send'],
    ['sent', null],
    ['cancelled', null],
  ]
  it.each(cases)('desde %s ofrece %s', (stage, key) => expect(nextStageAction(order(stage))?.key ?? null).toBe(key))
})

describe('getOrderActions', () => {
  it('pone la siguiente etapa primero si tiene permiso', () => {
    expect(getOrderActions(order('packing'), false, true).map((a) => a.key)).toEqual(['invoice', 'detail', 'copy'])
  })
  it('sin permiso de editar no ofrece avanzar', () => {
    expect(getOrderActions(order('packing'), false, false).map((a) => a.key)).toEqual(['detail', 'copy'])
  })
  it('anular solo con permiso', () => {
    expect(getOrderActions(order('packing'), true, false).map((a) => a.key)).toEqual(['detail', 'copy', 'cancel'])
  })
})
