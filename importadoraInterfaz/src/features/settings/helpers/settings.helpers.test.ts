// settings.helpers.test · validación de la clave nueva y del archivo del protector
import { describe, expect, it } from 'vitest'
import { validateNewPassword, validateScreensaverFile } from './settings.helpers'

describe('validateNewPassword', () => {
  it('vacía no se cambia', () => expect(validateNewPassword('', '')).toBeNull())
  it('exige que coincida', () => expect(validateNewPassword('abcdef', 'abcdeg')).toMatch(/no coinciden/))
  it('exige largo mínimo', () => expect(validateNewPassword('abc', 'abc')).toMatch(/al menos 6/))
  it('acepta una clave válida', () => expect(validateNewPassword('abcdef', 'abcdef')).toBeNull())
})

describe('validateScreensaverFile', () => {
  it('rechaza lo que no es imagen', () => expect(validateScreensaverFile({ type: 'application/pdf', size: 10 })).toMatch(/imagen válido/))
  it('rechaza más de 10MB', () => expect(validateScreensaverFile({ type: 'image/png', size: 11 * 1024 * 1024 })).toMatch(/10MB/))
  it('acepta una imagen normal', () => expect(validateScreensaverFile({ type: 'image/webp', size: 500 })).toBeNull())
})
