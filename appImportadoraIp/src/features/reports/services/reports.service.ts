// reports.service · llamadas al backend de reportes: POST /sales/summary, /reports/financial, /reports/customers y /reports/inventory
// conecta con: api/client y api/config, reports.adapter (convierte); las usa reports.thunks
// ojo: las fechas viajan como AAAA-MM-DD; el warehouseId solo se manda si hay bodega elegida. Los reportes de ventas en GET (/sales/report/general e internal) devuelven una lista vacía con los datos de prueba y no se usan
import { apiClient, API_CONFIG, type APIResponse } from '@/api'
import type { RequestContext } from '@/features/auth'
import { toCustomerMetrics, toFinancialMetrics, toInventoryMetrics, toSalesMetrics } from '../helpers/reports.adapter'
import type { CustomerReportDto, FinancialReportDto, InventoryReportDto, SalesSummaryDto } from '../types/reports.api.types'
import type { DateRange, ReportResult } from '../types/reports.types'

const { SALES, REPORTS } = API_CONFIG.ENDPOINTS

const withWarehouse = (warehouseId?: number) => (warehouseId !== undefined ? { warehouseId } : {})

export const fetchSalesSummary = async (ctx: RequestContext, range: DateRange, warehouseId?: number): Promise<ReportResult> => {
  const { data } = await apiClient.post<APIResponse<SalesSummaryDto>>(SALES.SUMMARY, {
    companyId: ctx.companyId,
    startDate: range.start,
    endDate: range.end,
    ...withWarehouse(warehouseId),
  })
  return { metrics: toSalesMetrics(data.data ?? {}), generatedAt: '' }
}

export const fetchFinancialReport = async (ctx: RequestContext, range: DateRange): Promise<ReportResult> => {
  const { data } = await apiClient.post<APIResponse<FinancialReportDto>>(REPORTS.FINANCIAL, {
    companyId: ctx.companyId,
    startDate: range.start,
    endDate: range.end,
  })
  const dto = data.data ?? {}
  return { metrics: toFinancialMetrics(dto), generatedAt: dto.generatedAt ?? '' }
}

export const fetchCustomerReport = async (ctx: RequestContext, range: DateRange): Promise<ReportResult> => {
  const { data } = await apiClient.post<APIResponse<CustomerReportDto>>(REPORTS.CUSTOMERS, {
    companyId: ctx.companyId,
    startDate: range.start,
    endDate: range.end,
  })
  const dto = data.data ?? {}
  return { metrics: toCustomerMetrics(dto), generatedAt: dto.generatedAt ?? '' }
}

export const fetchInventoryReport = async (ctx: RequestContext, warehouseId?: number): Promise<ReportResult> => {
  const { data } = await apiClient.post<APIResponse<InventoryReportDto>>(REPORTS.INVENTORY, {
    companyId: ctx.companyId,
    ...withWarehouse(warehouseId),
  })
  const dto = data.data ?? {}
  return { metrics: toInventoryMetrics(dto), generatedAt: dto.generatedAt ?? '' }
}
