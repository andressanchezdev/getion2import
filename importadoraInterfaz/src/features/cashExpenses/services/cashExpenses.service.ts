// cashExpenses.service · llamada al backend de los gastos de las cajas ya cerradas: GET /cash/expenses
// conecta con: api/client y api/config (CASH_EXPENSES), cashExpenses.adapter (convierte); la usa useCashExpenses
import { apiClient, API_CONFIG, toPaginated, type APIResponse, type Paginated } from '@/api'
import { toCashExpenseRecord, toExpenseParams } from '../helpers/cashExpenses.adapter'
import type { CashExpenseDto, CashExpenseFilters, CashExpenseRecord } from '../types/cashExpenses.types'

const { CASH_EXPENSES } = API_CONFIG.ENDPOINTS

// una página de los gastos de caja con los filtros puestos (la paginación y la búsqueda las hace el backend)
export const fetchCashExpenses = async (filters: CashExpenseFilters, page: number): Promise<Paginated<CashExpenseRecord>> => {
  const { data } = await apiClient.get<APIResponse<CashExpenseDto[] | null>>(CASH_EXPENSES.LIST, { params: toExpenseParams(filters, page) })
  const result = toPaginated(data)
  return { items: result.items.map(toCashExpenseRecord), meta: result.meta }
}
