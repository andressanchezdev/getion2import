// catalogs.adapter · convierte lo que responde el backend (brandId, categoryId, modelId) a la forma que usa la app (id, name)
// conecta con: catalogs.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend
import { getStorageUrl } from '@/global/helpers/storageUrl'
import type { Brand, BrandDto, Category, CategoryDto, ModelDto, MotoModel } from '../types/catalogs.types'

// nombre limpio; un registro sin nombre no sirve para mostrarse en una lista
const cleanName = (value: string | null | undefined): string => (value ?? '').trim()

// cada convertidor deja fuera los registros sin nombre
export const toBrands = (rows: BrandDto[]): Brand[] =>
  rows
    .filter((row) => cleanName(row.name))
    .map((row) => ({ id: row.brandId, name: cleanName(row.name), image: row.image ? getStorageUrl(row.image) : undefined }))

export const toCategories = (rows: CategoryDto[]): Category[] =>
  rows.filter((row) => cleanName(row.name)).map((row) => ({ id: row.categoryId, name: cleanName(row.name) }))

export const toMotoModels = (rows: ModelDto[]): MotoModel[] =>
  rows.filter((row) => cleanName(row.name)).map((row) => ({ id: row.modelId, name: cleanName(row.name) }))
