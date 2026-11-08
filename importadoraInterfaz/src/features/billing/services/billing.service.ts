// billing.service · llamadas al backend de facturación: datos fiscales (GET y PUT) y series de consecutivos (GET y PUT)
// conecta con: api/client y api/config (WAREHOUSES.FACTURATION y DOC_SERIES) y billing.adapter (convierte); las usa billing.thunks
// ojo: una bodega sin datos fiscales responde 404 en facturation: aquí eso es «null» (aún no configurada), no un error
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import { toBillingConfig, toDocSeries } from '../helpers/billing.adapter'
import type { BillingConfig, BillingConfigDto, BillingConfigInput, DocSeries, DocSeriesDto } from '../types/billing.types'

const { WAREHOUSES, DOC_SERIES } = API_CONFIG.ENDPOINTS

export const fetchBillingConfig = async (warehouseId: number): Promise<BillingConfig | null> => {
  try {
    const { data } = await apiClient.get<APIResponse<BillingConfigDto | null>>(WAREHOUSES.FACTURATION(warehouseId))
    return data.data ? toBillingConfig(data.data) : null
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404) return null
    throw error
  }
}

export const updateBillingConfig = async (warehouseId: number, input: BillingConfigInput): Promise<BillingConfig> => {
  const { data } = await apiClient.put<APIResponse<BillingConfigDto>>(WAREHOUSES.FACTURATION(warehouseId), input)
  return toBillingConfig(data.data!)
}

export const fetchDocSeries = async (warehouseId: number): Promise<DocSeries[]> => {
  const { data } = await apiClient.get<APIResponse<DocSeriesDto[] | null>>(DOC_SERIES.LIST, { params: { warehouseId } })
  return (data.data ?? []).map(toDocSeries)
}

export const updateDocSeries = async (seriesId: number, input: { prefix: string; nextNumber: number }): Promise<DocSeries> => {
  const { data } = await apiClient.put<APIResponse<DocSeriesDto>>(DOC_SERIES.BY_ID(seriesId), input)
  return toDocSeries(data.data!)
}
