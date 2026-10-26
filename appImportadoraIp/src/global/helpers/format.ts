// format · formatos compartidos: moneda (pesos colombianos) e iniciales de un nombre
// conecta con: WalletKpiHeader, CreditClientsTable, CreditAccountDrawer, ProductCard, ShopCartDrawer
// ojo: antes formatCOP estaba repetido en cada componente, ahora vive solo acá

// $ 165.000 (sin decimales)
export const formatCOP = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val)
}

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
