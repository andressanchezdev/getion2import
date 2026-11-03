// catalogs.service · llamadas al backend de los catálogos: GET, POST, PUT, DELETE /brands, /categories y /models
// conecta con: api/client, api/config (rutas) y api/params (companyId), catalogs.adapter (convierte la respuesta); las usa catalogs.thunks y DrawerRight
import { apiClient, API_CONFIG, withCompany, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toBrands, toCategories, toMotoModels } from '../helpers/catalogs.adapter'
import type { Brand, BrandDto, Category, CategoryDto, ModelDto, MotoModel } from '../types/catalogs.types'

const { CATALOGS, MODELS } = API_CONFIG.ENDPOINTS

// parámetros comunes de los tres catálogos
const params = (ctx: RequestContext) => withCompany(ctx.companyId, { activeOnly: true })

// trae las marcas de la compañía
export const fetchBrands = async (ctx: RequestContext): Promise<Brand[]> => {
  const { data } = await apiClient.get<APIResponse<BrandDto[] | null>>(CATALOGS.BRANDS, { params: params(ctx) })
  return toBrands(data.data ?? [])
}

// crea una marca con su nombre y, si hay, su imagen
export const createBrand = async (ctx: RequestContext, payload: { name: string; imageUrl?: string }): Promise<void> => {
  await apiClient.post('/brands', withCompany(ctx.companyId, payload))
}

// cambia el nombre o la imagen de una marca
export const updateBrand = async (brandId: number, payload: { name: string; imageUrl?: string }): Promise<void> => {
  await apiClient.put(`/brands/${brandId}`, payload)
}

// elimina una marca
export const deleteBrand = async (brandId: number): Promise<void> => {
  await apiClient.delete(`/brands/${brandId}`)
}

// trae las categorías de la compañía
export const fetchCategories = async (ctx: RequestContext): Promise<Category[]> => {
  const { data } = await apiClient.get<APIResponse<CategoryDto[] | null>>(CATALOGS.CATEGORIES, { params: params(ctx) })
  return toCategories(data.data ?? [])
}

// crea una categoría con su nombre y descripción
export const createCategory = async (ctx: RequestContext, payload: { name: string; description?: string }): Promise<void> => {
  await apiClient.post('/categories', withCompany(ctx.companyId, payload))
}

// cambia el nombre o la descripción de una categoría
export const updateCategory = async (categoryId: number, payload: { name: string; description?: string }): Promise<void> => {
  await apiClient.put(`/categories/${categoryId}`, payload)
}

// elimina una categoría
export const deleteCategory = async (categoryId: number): Promise<void> => {
  await apiClient.delete(`/categories/${categoryId}`)
}

// trae los modelos de moto de la compañía
export const fetchMotoModels = async (ctx: RequestContext): Promise<MotoModel[]> => {
  const { data } = await apiClient.get<APIResponse<ModelDto[] | null>>(MODELS.BASE, { params: params(ctx) })
  return toMotoModels(data.data ?? [])
}

// crea un modelo de moto con su nombre y descripción
export const createModel = async (ctx: RequestContext, payload: { name: string; description?: string }): Promise<void> => {
  await apiClient.post('/models', withCompany(ctx.companyId, payload))
}

// cambia el nombre o la descripción de un modelo de moto
export const updateModel = async (modelId: number, payload: { name: string; description?: string }): Promise<void> => {
  await apiClient.put(`/models/${modelId}`, payload)
}

// elimina un modelo de moto
export const deleteModel = async (modelId: number): Promise<void> => {
  await apiClient.delete(`/models/${modelId}`)
}
