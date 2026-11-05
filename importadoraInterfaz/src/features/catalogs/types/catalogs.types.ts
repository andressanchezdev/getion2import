// catalogs.types · contratos de los catálogos base (marcas, categorías y modelos de moto) y de su estado
// conecta con: catalogs.adapter (convierte lo del backend), catalogs.service, catalogs.slice y catalogs.selectors
import type { LoadStatus } from '@/api'

// ---- lo que usa la app ----
export interface Brand {
  id: number
  name: string
  image?: string
  isActive?: boolean
}

export interface Category {
  id: number
  name: string
  description?: string
  isActive?: boolean
}

// ojo: se llama MotoModel (y no Model) para no confundirlo con "modelo" de datos o de TypeScript
export interface MotoModel {
  id: number
  name: string
  description?: string
  isActive?: boolean
}

// ---- lo que responde la API en Go (GET /brands, /categories y /models: BrandResponse, CategoryResponse y ModelResponse) ----
// ojo: antes (backend anterior) venían como brandId, categoryId, modelId e image; ahora todos traen id e imageUrl
export interface BrandDto {
  id: number
  name: string
  imageUrl?: string | null
  isActive?: boolean
}

export interface CategoryDto {
  id: number
  name: string
  description?: string | null
  parentId?: number | null
  isActive?: boolean
}

export interface ModelDto {
  id: number
  name: string
  description?: string | null
  isActive?: boolean
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

// ---- edición de los catálogos desde el panel lateral y la tabla ----
export type CatalogType = 'brand' | 'category' | 'model'

// una fila de cualquiera de los tres catálogos, como la muestran la tabla y el detalle
export interface CatalogRow {
  id: number
  name: string
  image?: string
  description?: string
  isActive?: boolean
}

// lo que recibe el panel lateral: el tipo de catálogo, su nombre en plural y, si se edita, el registro
export interface CatalogItemPayload {
  type: CatalogType
  noun: string
  item?: CatalogRow
}

// lo que se envía al guardar un registro (id solo cuando se edita)
export interface CatalogItemInput {
  type: CatalogType
  id?: number
  name: string
  imageUrl?: string
  description?: string
  isActive?: boolean
}
