// billing.rules · reglas puras de facturación: cómo se ve el próximo número de una serie, qué falta en los datos fiscales y cuánto del rango autorizado queda
// conecta con: useBillingConfigForm, useDocSeriesForm y BillingSettingsScreen; no toca el store
// ojo: el API arma el número como prefijo + 6 dígitos (FE-000002); la API es la que manda y valida otra vez
import type { BillingConfig, BillingConfigInput } from '../types/billing.types'

// el próximo número tal como lo armará el API
export const nextNumberLabel = (prefix: string, nextNumber: number): string => `${prefix}${String(nextNumber).padStart(6, '0')}`

// por qué una serie no se puede guardar (null si está bien)
export const seriesProblem = (prefix: string, nextNumber: number): string | null => {
  if (prefix.trim() === '') return 'El prefijo es obligatorio'
  if (!Number.isInteger(nextNumber) || nextNumber < 1) return 'El próximo número debe ser un entero desde 1'
  return null
}

// por qué los datos fiscales no se pueden guardar (null si está bien)
export const colombianNITProblem = (value: string, documentType = 'NIT'): string | null => {
  const nit = value.trim().replace(/[.\s]/g, '')
  if (documentType !== 'NIT' || nit === '0') return null
  const match = /^([0-9]{9})-?([0-9])$/.exec(nit)
  if (!match) return 'El NIT debe contener nueve dígitos y un dígito de verificación.'
  const weights = [41, 37, 29, 23, 19, 17, 13, 7, 3]
  const sum = [...match[1]].reduce((total, digit, index) => total + Number(digit) * weights[index], 0)
  const remainder = sum % 11
  const checkDigit = remainder > 1 ? 11 - remainder : remainder
  return Number(match[2]) === checkDigit ? null : 'El dígito de verificación del NIT no es válido.'
}

export const billingProblem = (input: Pick<BillingConfigInput, 'nit' | 'legalName'> & { documentType?: string; rangeFrom?: number; rangeTo?: number }): string | null => {
  if (!input.nit || input.nit.trim() === '') return 'El NIT o documento es obligatorio'
  const nitProblem = colombianNITProblem(input.nit, input.documentType)
  if (nitProblem) return nitProblem
  if (!input.legalName || input.legalName.trim() === '') return 'La razón social es obligatoria'
  if (input.rangeFrom !== undefined && input.rangeTo !== undefined && input.rangeTo < input.rangeFrom) return 'El rango final no puede ser menor al inicial'
  return null
}

// cuántos números de la resolución quedan por usar según el próximo número de la serie de facturas (null si no hay rango)
export const rangeRemaining = (config: Pick<BillingConfig, 'rangeFrom' | 'rangeTo'>, nextInvoiceNumber: number): number | null => {
  if (config.rangeTo === null) return null
  const firstAllowedNumber = config.rangeFrom === null ? nextInvoiceNumber : Math.max(nextInvoiceNumber, config.rangeFrom)
  return Math.max(config.rangeTo - firstAllowedNumber + 1, 0)
}
