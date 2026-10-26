// reports.adapter · convierte lo que responde el backend en reportes a tarjetas de métricas (etiqueta, valor y formato)
// conecta con: reports.service (lo aplica a cada respuesta); es el único lugar que conoce los nombres del backend en reportes
// ojo: SUPUESTO a confirmar con datos reales: grossMargin llega como porcentaje (por ejemplo 32.5) y no como fracción (0.325). Un campo que falta queda en 0
import type { CustomerReportDto, FinancialReportDto, InventoryReportDto, SalesSummaryDto } from '../types/reports.api.types'
import type { ReportMetric } from '../types/reports.types'

const num = (value: number | undefined | null): number => (Number.isFinite(value) ? (value as number) : 0)

export const toSalesMetrics = (dto: SalesSummaryDto): ReportMetric[] => [
  { key: 'totalSales', label: 'Ventas del periodo', value: num(dto.totalSales), format: 'count' },
  { key: 'completed', label: 'Ventas completadas', value: num(dto.totalCompletedSales), format: 'count' },
  { key: 'pending', label: 'Ventas pendientes', value: num(dto.totalPendingSales), format: 'count' },
  { key: 'cancelled', label: 'Ventas anuladas', value: num(dto.totalCancelledSales), format: 'count' },
  { key: 'revenue', label: 'Ingresos', value: num(dto.totalRevenue), format: 'money' },
  { key: 'revenueCompleted', label: 'Ingresos de ventas completadas', value: num(dto.totalRevenueCompleted), format: 'money' },
  { key: 'average', label: 'Valor promedio por pedido', value: num(dto.averageOrderValue), format: 'money' },
]

export const toFinancialMetrics = (dto: FinancialReportDto): ReportMetric[] => [
  { key: 'revenue', label: 'Ingresos', value: num(dto.totalRevenue), format: 'money' },
  { key: 'cost', label: 'Costo', value: num(dto.totalCost), format: 'money' },
  { key: 'grossProfit', label: 'Utilidad bruta', value: num(dto.grossProfit), format: 'money' },
  { key: 'grossMargin', label: 'Margen bruto', value: num(dto.grossMargin), format: 'percent' },
  { key: 'discounts', label: 'Descuentos', value: num(dto.totalDiscounts), format: 'money' },
  { key: 'taxes', label: 'Impuestos', value: num(dto.totalTaxes), format: 'money' },
  { key: 'netRevenue', label: 'Ingreso neto', value: num(dto.netRevenue), format: 'money' },
  { key: 'receivable', label: 'Cuentas por cobrar', value: num(dto.accountsReceivable), format: 'money' },
]

export const toCustomerMetrics = (dto: CustomerReportDto): ReportMetric[] => [
  { key: 'total', label: 'Clientes', value: num(dto.totalCustomers), format: 'count' },
  { key: 'active', label: 'Clientes activos', value: num(dto.activeCustomers), format: 'count' },
  { key: 'new', label: 'Clientes nuevos', value: num(dto.newCustomers), format: 'count' },
  { key: 'revenue', label: 'Ingresos de clientes', value: num(dto.totalRevenue), format: 'money' },
  { key: 'average', label: 'Valor promedio por pedido', value: num(dto.averageOrderValue), format: 'money' },
]

export const toInventoryMetrics = (dto: InventoryReportDto): ReportMetric[] => [
  { key: 'products', label: 'Productos', value: num(dto.totalProducts), format: 'count' },
  { key: 'stock', label: 'Unidades en existencia', value: num(dto.totalStock), format: 'count' },
  { key: 'value', label: 'Valor del inventario', value: num(dto.totalValue), format: 'money' },
  { key: 'low', label: 'Con poco stock', value: num(dto.lowStockCount), format: 'count' },
  { key: 'out', label: 'Agotados', value: num(dto.outOfStockCount), format: 'count' },
]
