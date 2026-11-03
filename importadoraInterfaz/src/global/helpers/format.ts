// format · re-export universal de helpers de formato de moneda y fechas
import { formatCOP, formatDate as formatFullDate } from './formatting/format'

export { formatCOP }
export const formatCurrency = formatCOP
export const formatNumber = (val: number): string => new Intl.NumberFormat('es-CO').format(val)
export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—'
  return formatFullDate(dateStr)
}
export default formatCurrency
