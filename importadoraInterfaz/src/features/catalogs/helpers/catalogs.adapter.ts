// catalogs.adapter · convierte lo que responde la API en Go (id, name, imageUrl) a la forma que usa la app (id, name, image)
// conecta con: catalogs.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend
import { getStorageUrl } from '@/global/helpers/storage/storageUrl'
import type { Brand, BrandDto, Category, CategoryDto, ModelDto, MotoModel } from '../types/catalogs.types'

// nombre limpio; un registro sin nombre no sirve para mostrarse en una lista
const cleanName = (value: string | null | undefined): string => (value ?? '').trim()

// comprueba si el registro tiene nombre válido
const hasValidName = (row: { name: string }): boolean => cleanName(row.name) !== ''

// cada convertidor conserva todos los registros válidos (activos e inactivos) para gestión administrativa
export const toBrands = (rows: BrandDto[]): Brand[] =>
  rows.filter(hasValidName).map((row) => ({
    id: row.id,
    name: cleanName(row.name),
    image: row.imageUrl ? getStorageUrl(row.imageUrl) : undefined,
    isActive: row.isActive ?? true,
  }))

// convierte las categorías de la API en las que usa la app
export const toCategories = (rows: CategoryDto[]): Category[] =>
  rows.filter(hasValidName).map((row) => ({
    id: row.id,
    name: cleanName(row.name),
    description: cleanName(row.description) || undefined,
    parentId: row.parentId ?? null,
    isActive: row.isActive ?? true,
  }))

// convierte los modelos de moto de la API en los que usa la app
export const toMotoModels = (rows: ModelDto[]): MotoModel[] =>
  rows.filter(hasValidName).map((row) => ({
    id: row.id,
    name: cleanName(row.name),
    description: cleanName(row.description) || undefined,
    isActive: row.isActive ?? true,
  }))
