// locations.adapter · convierte lo que responde la API (ubicaciones y su contenido) a lo que usa la app, filtra la lista y arma el texto de los QR
// conecta con: locations.service (convierte cada respuesta), LocationsScreen (filtro) y las etiquetas QR de ubicaciones y productos
// ojo: el texto del QR tiene la forma «IP|L|bodega|código» (ubicación) o «IP|P|bodega|código de ubicación|código de producto» (producto en un estante); el prefijo IP permite que un lector sepa que es de este sistema
import type { QrLabel } from '@/global/components/UI/molecules/qr/QrLabelSheet'
import type { LocationContentItem, LocationDto, LocationStockDto, WarehouseLocation } from '../types/locations.types'

// pasa una ubicación de la API a lo que usa la app
export const toLocation = (dto: LocationDto): WarehouseLocation => ({
  id: dto.id,
  warehouseId: dto.warehouseId,
  code: dto.code,
  description: dto.description?.trim() ?? '',
  isActive: dto.isActive,
  productCount: dto.productCount ?? 0,
  units: dto.units ?? 0,
})

// pasa una fila de stock de la API a un producto guardado en la ubicación
export const toContentItem = (dto: LocationStockDto): LocationContentItem => ({
  stockId: dto.stockId,
  productId: dto.productId,
  productCode: dto.productCode,
  productName: dto.productName,
  brandName: dto.brandName?.trim() ?? '',
  available: dto.available,
  reserved: dto.reserved,
  sellable: dto.sellable,
})

// busca por código o descripción de la ubicación (sin importar mayúsculas)
export const filterLocations = (locations: WarehouseLocation[], query: string): WarehouseLocation[] => {
  const needle = query.trim().toLowerCase()
  if (!needle) return locations
  return locations.filter((location) => `${location.code} ${location.description}`.toLowerCase().includes(needle))
}

// dice si la ubicación guarda productos (al desactivarla se avisa antes)
export const hasStock = (location: WarehouseLocation): boolean => location.productCount > 0 || location.units > 0

// el texto que guarda el QR de una ubicación
export const locationQrValue = (warehouseId: number, code: string): string => `IP|L|${warehouseId}|${code}`

// el texto que guarda el QR de un producto en una ubicación
export const productQrValue = (warehouseId: number, locationCode: string, productCode: string): string => `IP|P|${warehouseId}|${locationCode}|${productCode}`

// lo que dice un QR leído: una ubicación, un producto en una ubicación, o nada que sea de este sistema
export type ParsedQr = { kind: 'location'; warehouseId: number; code: string } | { kind: 'product'; warehouseId: number; locationCode: string; productCode: string } | null

// interpreta el texto de un QR leído con la cámara o el lector
export const parseQrValue = (text: string): ParsedQr => {
  const parts = text.trim().split('|')
  if (parts[0] !== 'IP') return null
  const warehouseId = Number(parts[2])
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) return null
  if (parts[1] === 'L' && parts.length === 4 && parts[3]) return { kind: 'location', warehouseId, code: parts[3] }
  if (parts[1] === 'P' && parts.length === 5 && parts[3] && parts[4]) return { kind: 'product', warehouseId, locationCode: parts[3], productCode: parts[4] }
  return null
}

// la etiqueta QR para pegar en el estante de la ubicación
export const locationLabel = (location: WarehouseLocation, warehouseName: string): QrLabel => ({
  value: locationQrValue(location.warehouseId, location.code),
  title: location.code,
  subtitle: location.description || undefined,
  caption: warehouseName,
})

// la etiqueta QR de un producto guardado en una ubicación
export const productLabel = (warehouseId: number, locationCode: string, productCode: string, productName: string, warehouseName: string): QrLabel => ({
  value: productQrValue(warehouseId, locationCode, productCode),
  title: productCode,
  subtitle: productName,
  caption: `${warehouseName} · ${locationCode}`,
})
