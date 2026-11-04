// bank.constants · estado inicial, tamaño de página y opciones de filtro de la conciliación bancaria
// conecta con: bank.slice (initialState), bank.service (página) y BankFiltersBar (opciones)
import { DEFAULT_PAGE_SIZE } from '@/api'
import type { BankFilters, BankState } from '../types/bank.types'

export const BANK_PAGE_SIZE = DEFAULT_PAGE_SIZE

export const INITIAL_BANK_FILTERS: BankFilters = { status: 'pending', warehouseId: null, query: '', from: '', to: '' }

// la lista arranca vacía: no hay datos de ejemplo; todo sale del PDF que se sube
export const INITIAL_BANK_STATE: BankState = {
  list: { items: [], meta: null, status: 'idle', error: null, page: 1, filters: INITIAL_BANK_FILTERS, requestId: null },
  upload: { status: 'idle', error: null, result: null },
  pendingPayments: { items: [], status: 'idle', error: null },
  saving: false,
}

export const BANK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Por confirmar' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'ignored', label: 'Ignorados' },
  { value: 'all', label: 'Todos' },
]
