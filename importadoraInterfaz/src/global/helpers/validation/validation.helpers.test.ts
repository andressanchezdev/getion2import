// validation.helpers.test · pruebas de los validadores de teléfono, correo y enteros en formato colombiano
// conecta con: validation.helpers; se corre con npm test
import { describe, expect, it } from 'vitest'
import { SANITIZERS, emailProblem, integerProblem, phoneProblem } from './validation.helpers'

describe('phoneProblem', () => {
  it('acepta celular, fijo de 7 y fijo con indicativo; vacío solo si no es obligatorio', () => {
    expect(phoneProblem('3001234567')).toBeNull()
    expect(phoneProblem('300 123 4567')).toBeNull()
    expect(phoneProblem('2345678')).toBeNull()
    expect(phoneProblem('6012345678')).toBeNull()
    expect(phoneProblem('')).toBeNull()
    expect(phoneProblem('', true)).not.toBeNull()
  })

  it('rechaza largos o prefijos que no existen', () => {
    expect(phoneProblem('2001234567')).not.toBeNull()
    expect(phoneProblem('30012345')).not.toBeNull()
    expect(phoneProblem('0123456')).not.toBeNull()
  })

  it('phoneCO deja solo dígitos y corta a 10', () => {
    expect(SANITIZERS.phoneCO('+57 (300) 123-4567 89')).toBe('5730012345')
  })
})

describe('emailProblem e integerProblem', () => {
  it('correo', () => {
    expect(emailProblem('a@b.co')).toBeNull()
    expect(emailProblem('a@b')).not.toBeNull()
    expect(emailProblem('', true)).not.toBeNull()
    expect(emailProblem('')).toBeNull()
  })

  it('entero en rango', () => {
    expect(integerProblem('30', 'Los días', 0, 365)).toBeNull()
    expect(integerProblem('366', 'Los días', 0, 365)).not.toBeNull()
    expect(integerProblem('1.5', 'Los días', 0, 365)).not.toBeNull()
    expect(integerProblem('', 'Los días', 0, 365, true)).not.toBeNull()
  })
})
