// externals.filters · filtra la tabla de proveedores y transportadoras por texto y por estado
// conecta con: useExternals (lo aplica) y externals.types
import type { ExternalEntity, ExternalStatusFilter } from '../types/externals.types'

// busca en nombre, documento, contacto, ciudad y teléfono (sin importar mayúsculas) y filtra por estado
export const filterExternals = (items: ExternalEntity[], query: string, status: ExternalStatusFilter): ExternalEntity[] => {
  const needle = query.trim().toLowerCase()
  return items.filter((item) => {
    if (status === 'active' && !item.isActive) return false
    if (status === 'inactive' && item.isActive) return false
    if (!needle) return true
    return [item.name, item.document, item.contactName, item.city, item.phone].some((text) => (text ?? '').toLowerCase().includes(needle))
  })
}
