// MoneyInput.test · pruebas del campo de dinero: puntos de miles al escribir, solo dígitos, ceros a la izquierda, tope y posición del cursor
// conecta con: MoneyInput y format (formatThousands, onlyDigits); se corre con npm test
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatThousands, onlyDigits } from '@/global/helpers/formatting/format'
import { MoneyInput } from './MoneyInput'

afterEach(cleanup)

// el campo dentro de un estado real, como lo usan los formularios (value en dígitos, sin ceros sueltos)
const Harness = ({ initial = '', max, onDigits }: { initial?: string; max?: number; onDigits?: (digits: string) => void }) => {
  const [value, setValue] = useState(initial)
  return (
    <MoneyInput
      aria-label="monto"
      value={value}
      max={max}
      onValueChange={(digits) => {
        setValue(digits)
        onDigits?.(digits)
      }}
    />
  )
}
const field = () => screen.getByLabelText('monto') as HTMLInputElement
const type = (text: string) => fireEvent.change(field(), { target: { value: text } })

describe('formatThousands y onlyDigits', () => {
  it('agrupa de a tres con punto', () => {
    expect(formatThousands('0')).toBe('0')
    expect(formatThousands('999')).toBe('999')
    expect(formatThousands('1000')).toBe('1.000')
    expect(formatThousands('165000')).toBe('165.000')
    expect(formatThousands('1250000')).toBe('1.250.000')
    expect(formatThousands('10000000000')).toBe('10.000.000.000')
  })

  it('sin dígitos devuelve vacío y limpia lo que no es número', () => {
    expect(formatThousands('')).toBe('')
    expect(formatThousands('$ 1.250.000')).toBe('1.250.000')
    expect(onlyDigits('$ 1.250,50 COP')).toBe('125050')
  })
})

describe('MoneyInput', () => {
  it('muestra el valor inicial con puntos', () => {
    render(<Harness initial="2500000" />)
    expect(field().value).toBe('2.500.000')
  })

  it('al escribir va poniendo el punto de miles y entrega solo dígitos', () => {
    const onDigits = vi.fn()
    render(<Harness onDigits={onDigits} />)
    type('1')
    type('12')
    type('123')
    expect(field().value).toBe('123')
    type('1234')
    expect(field().value).toBe('1.234')
    type('1.2345')
    expect(field().value).toBe('12.345')
    type('12.3456')
    expect(field().value).toBe('123.456')
    type('123.4567')
    expect(field().value).toBe('1.234.567')
    expect(onDigits).toHaveBeenLastCalledWith('1234567')
  })

  it('ignora letras y símbolos', () => {
    render(<Harness />)
    type('12abc$-,')
    expect(field().value).toBe('12')
  })

  it('quita los ceros a la izquierda', () => {
    render(<Harness />)
    type('007')
    expect(field().value).toBe('7')
    type('0')
    expect(field().value).toBe('0')
  })

  it('al borrar todo queda vacío', () => {
    const onDigits = vi.fn()
    render(<Harness initial="1500" onDigits={onDigits} />)
    type('')
    expect(field().value).toBe('')
    expect(onDigits).toHaveBeenLastCalledWith('')
  })

  it('respeta el tope: lo que lo pasa se ignora', () => {
    render(<Harness initial="400" max={500} />)
    type('4000')
    expect(field().value).toBe('400')
    type('450')
    expect(field().value).toBe('450')
  })

  it('al escribir en medio del número, el cursor queda junto al dígito escrito aunque se muevan los puntos', () => {
    render(<Harness initial="1250000" />)
    const input = field()
    input.focus()
    const setCaret = vi.spyOn(input, 'setSelectionRange')
    // el usuario puso el cursor después de «1.25» y escribió un 9: el texto queda «1.2590.000» con el cursor en 5
    Object.defineProperty(input, 'selectionStart', { configurable: true, get: () => 5 })
    type('1.2590.000')
    expect(input.value).toBe('12.590.000')
    expect(setCaret).toHaveBeenLastCalledWith(5, 5) // justo después del 9 de «12.59»
  })
})
