// auth.adapter.test · prueba que la respuesta de la API se convierta al usuario de la app
// conecta con: auth.adapter
import { describe, expect, it } from 'vitest'
import { toAuthResponse, toAuthUser } from './auth.adapter'
import type { AuthApiResponse } from '../types/auth.api.types'

const base = (actor: Partial<AuthApiResponse['actor']>): AuthApiResponse => ({
  access_token: 'a',
  refresh_token: 'r',
  expiresIn: 1800,
  actorType: 'admin',
  permissions: [],
  actor: { id: 7, actorType: 'admin', email: 'a@b.co', firstName: 'Ana', lastName: 'Ruiz', fullName: 'Ana Ruiz', status: 'active', ...actor },
})

describe('toAuthUser', () => {
  it('convierte el actor de un administrador de compañía', () => {
    const user = toAuthUser(base({ companyId: 1, companyName: 'Importadora', warehouseId: 2, document: '123', photoUrl: 'x.png' }))
    expect(user).toMatchObject({ userId: 7, companyId: 1, warehouseId: 2, name: 'Ana', lastName: 'Ruiz', identification: '123', photo: 'x.png', userType: 'admin' })
    expect(user.companyInformation).toEqual({ businessName: 'Importadora' })
  })

  it('el superadmin no tiene compañía: companyId queda en 0 y sin información de empresa', () => {
    const user = toAuthUser(base({ actorType: 'superadmin' }))
    expect(user.companyId).toBe(0)
    expect(user.companyInformation).toBeUndefined()
    expect(user.userType).toBe('superadmin')
  })
})

describe('toAuthResponse', () => {
  it('conserva los dos tokens y arma el usuario', () => {
    const res = toAuthResponse(base({ companyId: 1 }))
    expect(res.access_token).toBe('a')
    expect(res.refresh_token).toBe('r')
    expect(res.user.companyId).toBe(1)
  })
})
