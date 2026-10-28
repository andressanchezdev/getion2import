// catalogs.service · llamadas al backend de los catálogos: POST /brands, POST /categories y POST /models
// conecta con: api/client y api/config (rutas), catalogs.adapter (convierte la respuesta); las usa catalogs.thunks
// ojo: el companyId llega en el contexto de petición (lo pasa el thunk); este service no lee el almacenamiento ni el store
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { CATALOG_PAGE_SIZE } from '../constants/catalogs.constants'
import { toBrands, toCategories, toMotoModels } from '../helpers/catalogs.adapter'
import type { Brand, BrandDto, Category, CategoryDto, ModelDto, MotoModel } from '../types/catalogs.types'

const { CATALOGS, MODELS } = API_CONFIG.ENDPOINTS

// cuerpo común de los tres catálogos
const body = (ctx: RequestContext) => ({ companyId: ctx.companyId, page: 1, pageSize: CATALOG_PAGE_SIZE })

export const fetchBrands = async (ctx: RequestContext): Promise<Brand[]> => {
  const { data } = await apiClient.post<APIResponse<BrandDto[] | null>>(CATALOGS.BRANDS, body(ctx))
  return toBrands(data.data ?? [])
}

export const fetchCategories = async (ctx: RequestContext): Promise<Category[]> => {
  const { data } = await apiClient.post<APIResponse<CategoryDto[] | null>>(CATALOGS.CATEGORIES, body(ctx))
  return toCategories(data.data ?? [])
}

export const fetchMotoModels = async (ctx: RequestContext): Promise<MotoModel[]> => {
  const { data } = await apiClient.post<APIResponse<ModelDto[] | null>>(MODELS.BASE, body(ctx))
  return toMotoModels(data.data ?? [])
}
