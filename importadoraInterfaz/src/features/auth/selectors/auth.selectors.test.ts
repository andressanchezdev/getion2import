// auth.selectors.test · pruebas del contexto de petición (companyId, userId, bodega y nivel de precio)
// conecta con: auth.selectors; se corre con npm test
import { describe, expect, it } from 'vitest'
import { selectRequestContext } from './auth.selectors'
import type { AuthState, AuthUser } from '../types/auth.types'

const user: AuthUser = {
  userId: 7,
  companyId: 3,
  warehouseId: 2,
  name: 'Ana',
  lastName: 'Pérez',
  email: 'ana@prueba.local',
  identification: '1',
  photo: '',
  userType: 'ADMIN',
  priceType: 'P1',
}

const stateWith = (value: AuthUser | null): { auth: AuthState } => ({
  auth: { user: value, status: value ? 'authenticated' : 'anonymous', error: null },
})

describe('selectRequestContext', () => {
  it('devuelve null sin sesión', () => {
    expect(selectRequestContext(stateWith(null))).toBeNull()
  })

  it('arma el contexto con los datos del usuario', () => {
    expect(selectRequestContext(stateWith(user))).toEqual({ companyId: 3, userId: 7, warehouseId: 2, priceType: 'P1' })
  })

  it('una sesión guardada antes (sin priceType) sigue funcionando', () => {
    const oldUser: AuthUser = { ...user, priceType: undefined }
    expect(selectRequestContext(stateWith(oldUser))?.priceType).toBeUndefined()
  })

  it('no recalcula si el usuario no cambió (mismo objeto)', () => {
    const state = stateWith(user)
    expect(selectRequestContext(state)).toBe(selectRequestContext(state))
  })
})
