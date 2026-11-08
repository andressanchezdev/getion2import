// reasonRequests.test — la libreta de peticiones entrega cada respuesta una sola vez y distingue confirmar de cancelar
// conecta con: reasonRequests; se corre con npm test
import { describe, expect, it } from 'vitest'
import { createReasonRequest, hasPendingReasonRequest, settleReasonRequest } from './reasonRequests'

describe('reasonRequests', () => {
  it('entrega el texto escrito a quien esperaba', () => {
    let received: string | null | undefined
    const id = createReasonRequest((reason) => {
      received = reason
    })
    expect(hasPendingReasonRequest(id)).toBe(true)
    settleReasonRequest(id, 'Salida de la empresa')
    expect(received).toBe('Salida de la empresa')
    expect(hasPendingReasonRequest(id)).toBe(false)
  })

  it('cancelar entrega null', () => {
    let received: string | null | undefined
    const id = createReasonRequest((reason) => {
      received = reason
    })
    settleReasonRequest(id, null)
    expect(received).toBeNull()
  })

  it('resolver dos veces o una petición inexistente no hace nada', () => {
    let calls = 0
    const id = createReasonRequest(() => {
      calls += 1
    })
    settleReasonRequest(id, 'uno')
    settleReasonRequest(id, 'dos')
    settleReasonRequest('reason-que-no-existe', 'x')
    expect(calls).toBe(1)
  })

  it('cada petición tiene su propio id', () => {
    const a = createReasonRequest(() => undefined)
    const b = createReasonRequest(() => undefined)
    expect(a).not.toBe(b)
    settleReasonRequest(a, null)
    settleReasonRequest(b, null)
  })
})
