// format · formatos compartidos: moneda (pesos colombianos), puntos de miles al escribir e iniciales de un nombre
// conecta con: WalletKpiHeader, CreditClientsTable, CreditAccountDrawer, ProductCard, ShopCartDrawer
// ojo: antes formatCOP estaba repetido en cada componente, ahora vive solo acá

// $165.000 (sin decimales); es el mismo formato de formatPesos para que todos los montos de la app se vean igual
export const formatCOP = (val: number) => formatPesos(val)

// alias universal de moneda
export const formatCurrency = formatCOP

// número con separador de miles (sin símbolo $)
export const formatNumber = (val: number): string => new Intl.NumberFormat('es-CO').format(val)

// $165.000 sin espacio después del signo, como se ve en las cards y el carrito de la maqueta (sin decimales)
export const formatPesos = (val: number) => `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(val)}`

// 27 oct 2026, 10:42 (fecha y hora cortas en español de Colombia); '—' si no hay fecha válida
export const formatDateTime = (value?: string | null): string => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

// 27 oct 2026 (solo la fecha, en español de Colombia); '—' si no hay fecha válida
export const formatDate = (value?: string | null): string => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date)
}

// deja solo los dígitos de un texto ('$ 1.250.000' -> '1250000'); sirve para campos de dinero y de cantidades
export const onlyDigits = (text: string): string => text.replace(/\D/g, '')

// agrupa los dígitos de a tres con punto, como se escriben los pesos ('1250000' -> '1.250.000'); sin dígitos devuelve ''
export const formatThousands = (digits: string): string => onlyDigits(digits).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

// $165k (versión corta para botones de nivel de precio)
export const formatShortK = (val: number) => {
  return `$${Math.round(val / 1000)}k`
}

// iniciales de un nombre (Usuario Administrador -> UA), para el avatar
export const getInitials = (name: string) => {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}
