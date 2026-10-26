// catalogs.types · contratos de los catálogos base (marcas, categorías y modelos de moto) y de su estado
// conecta con: catalogs.adapter (convierte lo del backend), catalogs.service, catalogs.slice y catalogs.selectors
import type { LoadStatus } from '@/api'

// ---- lo que usa la app ----
export interface Brand {
  id: number
  name: string
  image?: string
}

export interface Category {
  id: number
  name: string
}

// ojo: se llama MotoModel (y no Model) para no confundirlo con "modelo" de datos o de TypeScript
export interface MotoModel {
  id: number
  name: string
}

// ---- lo que responde el backend (Swagger: models.BrandResponse, CategoryResponse y ModelResponse) ----
export interface BrandDto {
  brandId: number
  name: string
  image?: string
}

export interface CategoryDto {
  categoryId: number
  name: string
}

export interface ModelDto {
  modelId: number
  name: string
}

// ---- estado del slice: cada catálogo se carga por separado ----
export interface CatalogResource<T> {
  items: T[]
  status: LoadStatus
  error: string | null
}

export interface CatalogsState {
  brands: CatalogResource<Brand>
  categories: CatalogResource<Category>
  models: CatalogResource<MotoModel>
}
