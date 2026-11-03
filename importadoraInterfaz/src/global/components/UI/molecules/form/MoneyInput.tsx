// MoneyInput · campo de dinero en pesos: muestra los puntos de miles mientras se escribe (1.250.000) y entrega solo los dígitos
// conecta con: format (formatThousands, onlyDigits); lo usan el cupo de crédito, el abono y las tarifas de un producto; hereda las clases del campo donde se use (className)
// ojo: es un input de texto (no «number») porque el navegador no deja escribir puntos en uno numérico; solo acepta dígitos, quita los ceros a la izquierda y respeta el tope (max)
// ojo: al escribir en medio del número el cursor se queda junto al mismo dígito, no salta al final cuando el punto de miles se mueve
import React, { useLayoutEffect, useRef } from 'react'
import { formatThousands, onlyDigits } from '@/global/helpers/formatting/format'

export interface MoneyInputProps {
  value: number | string // el valor en dígitos; vacío (o 0 pasado como '') deja el campo en blanco
  onValueChange: (digits: string) => void // solo dígitos, sin puntos ni ceros a la izquierda ('' si se borra todo)
  max?: number // tope: lo que lo pase se ignora
  id?: string
  name?: string
  className?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  'aria-label'?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  onBlur?: () => void
}

// 13 dígitos: bastan para cualquier monto del negocio y se mantienen dentro de lo que JavaScript suma sin perder precisión
const DEFAULT_MAX = 9_999_999_999_999

// posición dentro del texto formateado justo después del dígito número «digitCount»
const caretAfterDigit = (formatted: string, digitCount: number): number => {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) seen += 1
    if (seen === digitCount) return i + 1
  }
  return formatted.length
}

// campo de dinero: muestra los puntos de miles al escribir y entrega solo los dígitos
export const MoneyInput: React.FC<MoneyInputProps> = ({ value, onValueChange, max = DEFAULT_MAX, onBlur, ...rest }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingDigits = useRef<number | null>(null) // cuántos dígitos había antes del cursor al escribir
  const formatted = formatThousands(onlyDigits(String(value ?? '')))

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value
    const caret = event.target.selectionStart ?? typed.length
    const digits = onlyDigits(typed).replace(/^0+(?=\d)/, '')
    if (digits !== '' && Number(digits) > max) return // se pasó del tope: se ignora lo escrito
    pendingDigits.current = onlyDigits(typed.slice(0, caret)).replace(/^0+(?=\d)/, '').length
    onValueChange(digits)
  }

  // después de pintar el nuevo texto, el cursor vuelve a quedar junto al dígito donde se estaba escribiendo
  useLayoutEffect(() => {
    const input = inputRef.current
    const digitCount = pendingDigits.current
    pendingDigits.current = null
    if (!input || digitCount === null || document.activeElement !== input) return
    const position = caretAfterDigit(input.value, digitCount)
    input.setSelectionRange(position, position)
  })

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatted}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={(event) => event.target.select()}
    />
  )
}

export default MoneyInput
