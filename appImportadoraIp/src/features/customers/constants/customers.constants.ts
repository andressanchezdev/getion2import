// customers.constants · tamaños de página, textos y estado inicial de clientes
// conecta con: customers.service (cuántos pide), customers.slice (initialState) y los componentes (textos)
import type { CustomersState, DirectionInput } from '../types/customers.types'

export const CUSTOMERS_PAGE_SIZE = 30

// las direcciones y los descuentos de un cliente caben en una sola página
export const CUSTOMER_EXTRAS_PAGE_SIZE = 50

export const EMPTY_DIRECTION_INPUT: DirectionInput = {
  address: '',
  neighborhood: '',
  city: '',
  department: '',
  country: 'Colombia',
  additionalInfo: '',
}

const emptyResource = () => ({ items: [], status: 'idle' as const, error: null, saving: false })

export const INITIAL_CUSTOMERS_STATE: CustomersState = {
  list: { items: [], status: 'idle', error: null, meta: null, page: 1, query: '', requestId: null },
  selectedId: null,
  detail: { data: null, status: 'idle', error: null, requestId: null },
  directions: emptyResource(),
  discounts: emptyResource(),
}
