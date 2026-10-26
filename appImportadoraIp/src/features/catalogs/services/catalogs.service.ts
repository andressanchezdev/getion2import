// catalogs.service · llamadas al backend de los catálogos: POST /brands, POST /categories y POST /models
// conecta con: api/client y api/config (rutas), catalogs.adapter (convierte la respuesta); las usa catalogs.thunks
// ojo: el companyId llega en el contexto de petición (lo pasa el thunk); este service no lee el almacenamiento ni el store
// ojo: el backend tiene más de 500 categorías y modelos (529 y 552 en la empresa de prueba): se lee la primera página y el resto en paralelo; si hubiera más de 20 páginas se avisa con un error en vez de cortar la lista en silencio
import { apiClient, API_CONFIG, toPaginated, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { CATALOG_PAGE_SIZE } from '../constants/catalogs.constants'
import { toBrands, toCategories, toMotoModels } from '../helpers/catalogs.adapter'
import type { Brand, BrandDto, Category, CategoryDto, ModelDto, MotoModel } from '../types/catalogs.types'

const { CATALOGS } = API_CONFIG.ENDPOINTS

const MAX_PAGES = 20

const fetchPage = async <T>(ctx: RequestContext, url: string, page: number) => {
  const { data } = await apiClient.post<APIResponse<T[] | null>>(url, { companyId: ctx.companyId, page, pageSize: CATALOG_PAGE_SIZE })
  return toPaginated(data)
}

// pide la primera página y, como ya se sabe cuántas hay (meta.totalPages), el resto EN PARALELO; si hay más de MAX_PAGES falla con un mensaje en vez de devolver la lista cortada sin avisar
const fetchAllRows = async <T>(ctx: RequestContext, url: string): Promise<T[]> => {
  const first = await fetchPage<T>(ctx, url, 1)
  const totalPages = first.meta.totalPages
  if (totalPages > MAX_PAGES) throw new Error(`El catálogo tiene ${totalPages} páginas y solo se pueden leer ${MAX_PAGES}.`)
  if (first.items.length === 0 || !first.meta.hasNextPage || totalPages <= 1) return first.items
  const rest = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => fetchPage<T>(ctx, url, index + 2)))
  return [first.items, ...rest.map((page) => page.items)].flat()
}

export const fetchBrands = async (ctx: RequestContext): Promise<Brand[]> => {
  return toBrands(await fetchAllRows<BrandDto>(ctx, CATALOGS.BRANDS))
}

export const fetchCategories = async (ctx: RequestContext): Promise<Category[]> => {
  return toCategories(await fetchAllRows<CategoryDto>(ctx, CATALOGS.CATEGORIES))
}

export const fetchMotoModels = async (ctx: RequestContext): Promise<MotoModel[]> => {
  return toMotoModels(await fetchAllRows<ModelDto>(ctx, CATALOGS.MODELS))
}
