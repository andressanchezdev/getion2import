// catalogs.adapter · convierte lo que responde la API en Go (id, name, imageUrl) a la forma que usa la app (id, name, image)
// conecta con: catalogs.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend
import { getStorageUrl } from '@/global/helpers/storage/storageUrl'
import type { Brand, BrandDto, Category, CategoryDto, ModelDto, MotoModel } from '../types/catalogs.types'

// nombre limpio; un registro sin nombre no sirve para mostrarse en una lista
const cleanName = (value: string | null | undefined): string => (value ?? '').trim()

// un registro inactivo no se ofrece en los filtros; si la API no manda el dato se deja pasar
const isShown = (row: { name: string; isActive?: boolean }): boolean => cleanName(row.name) !== '' && row.isActive !== false

// cada convertidor deja fuera los registros sin nombre o inactivos
export const toBrands = (rows: BrandDto[]): Brand[] =>
  rows.filter(isShown).map((row) => ({ id: row.id, name: cleanName(row.name), image: row.imageUrl ? getStorageUrl(row.imageUrl) : undefined }))

// convierte las categorías de la API en las que usa la app
export const toCategories = (rows: CategoryDto[]): Category[] =>
  rows.filter(isShown).map((row) => ({ id: row.id, name: cleanName(row.name) }))

// convierte los modelos de moto de la API en los que usa la app
export const toMotoModels = (rows: ModelDto[]): MotoModel[] =>
  rows.filter(isShown).map((row) => ({ id: row.id, name: cleanName(row.name) }))
