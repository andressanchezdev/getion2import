// auth.token.test · pruebas de la lectura del vencimiento (exp) de un JWT y de cuándo toca renovarlo
// conecta con: auth.token; se corre con npm test
import { describe, expect, it } from 'vitest'
import { getTokenExpiry, msUntilExpiry, shouldRefreshToken } from './auth.token'

// arma un JWT de prueba (la firma no importa porque no se valida) con el payload en base64url
const toBase64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const makeToken = (payload: object) => `${toBase64Url({ alg: 'HS256' })}.${toBase64Url(payload)}.firma`

const NOW = 1_700_000_000_000 // un instante fijo en milisegundos
const inSeconds = (seconds: number) => Math.floor(NOW / 1000) + seconds

describe('getTokenExpiry', () => {
  it('devuelve exp en milisegundos', () => {
    expect(getTokenExpiry(makeToken({ exp: 1_700_000_100 }))).toBe(1_700_000_100_000)
  })

  it('devuelve null si el token no tiene exp', () => {
    expect(getTokenExpiry(makeToken({ sub: '1' }))).toBeNull()
  })

  it('devuelve null si exp no es un número', () => {
    expect(getTokenExpiry(makeToken({ exp: 'mañana' }))).toBeNull()
  })

  it('devuelve null con un token que no se puede leer', () => {
    expect(getTokenExpiry('')).toBeNull()
    expect(getTokenExpiry('sin-puntos')).toBeNull()
    expect(getTokenExpiry('a.%%%.c')).toBeNull()
  })

  it('lee payloads con caracteres de base64url (- y _)', () => {
    // el nombre con tildes genera caracteres que en base64 normal serían + y /
    const token = makeToken({ name: '¿¿¿???>>>', exp: 1_700_000_100 })
    expect(getTokenExpiry(token)).toBe(1_700_000_100_000)
  })
})

describe('msUntilExpiry', () => {
  it('cuenta lo que falta', () => {
    expect(msUntilExpiry(makeToken({ exp: inSeconds(90) }), NOW)).toBe(90_000)
  })

  it('da un valor negativo si ya venció', () => {
    expect(msUntilExpiry(makeToken({ exp: inSeconds(-10) }), NOW)).toBe(-10_000)
  })

  it('da null si no se puede saber', () => {
    expect(msUntilExpiry('basura', NOW)).toBeNull()
  })
})

describe('shouldRefreshToken', () => {
  const margin = 60_000

  it('es false si falta más que el margen', () => {
    expect(shouldRefreshToken(makeToken({ exp: inSeconds(90) }), margin, NOW)).toBe(false)
  })

  it('es true si falta el margen o menos', () => {
    expect(shouldRefreshToken(makeToken({ exp: inSeconds(60) }), margin, NOW)).toBe(true)
    expect(shouldRefreshToken(makeToken({ exp: inSeconds(30) }), margin, NOW)).toBe(true)
  })

  it('es true si ya venció', () => {
    expect(shouldRefreshToken(makeToken({ exp: inSeconds(-5) }), margin, NOW)).toBe(true)
  })

  it('es false con un token ilegible (no se renueva por tiempo)', () => {
    expect(shouldRefreshToken('basura', margin, NOW)).toBe(false)
  })
})
