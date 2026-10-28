// storageUrl · resolución de rutas relativas de Google Cloud Storage a URLs públicas completas
// conecta con: API_CONFIG (STORAGE_BASE_URL), shop.adapter, catalogs.adapter y cualquier consumidor de imágenes del bucket
import { API_CONFIG } from '@/api/config'

/**
 * Resuelve una ruta de imagen de Google Cloud Storage a su URL pública completa.
 * Si ya es una URL externa absoluta (https:// o http://), la retorna intacta.
 * Si es una ruta relativa (ej: 'productos/prod-123.jpg' o 'marcas/yamaha.png'),
 * la concatena con el STORAGE_BASE_URL configurado.
 */
export const getStorageUrl = (path: string | null | undefined): string => {
  if (!path || typeof path !== 'string') return ''
  const trimmed = path.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return ''

  // Si ya es una URL absoluta externa (https://...), se retorna intacta
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  // Concatenar URL base del bucket con la ruta relativa del archivo
  const base = (API_CONFIG.STORAGE_BASE_URL || '').replace(/\/+$/g, '')
  const rel = trimmed.replace(/^\/+/, '')
  return base ? `${base}/${rel}` : rel
}

export default getStorageUrl
