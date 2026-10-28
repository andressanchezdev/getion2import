// customers.selectors · lecturas de clientes: lista visible (con búsqueda), paginación, cliente abierto, detalle, direcciones, descuentos y datos del encabezado del panel
// conecta con: CustomersScreen y sus partes, CustomerDrawer y drawerRegistry (selectCustomerDrawerMeta, selectHasOpenCustomer); leen state.customers
import { createSelector } from '@reduxjs/toolkit'
import { filterCustomers } from '../helpers/customers.adapter'
import type { CustomersState } from '../types/customers.types'

// forma mínima del state (así la feature no importa el store de app)
type CustomersRootState = { customers: CustomersState }

const selectList = (state: CustomersRootState) => state.customers.list

export const selectCustomersStatus = (state: CustomersRootState) => state.customers.list.status
export const selectCustomersError = (state: CustomersRootState) => state.customers.list.error
export const selectCustomersMeta = (state: CustomersRootState) => state.customers.list.meta
export const selectCustomersPage = (state: CustomersRootState) => state.customers.list.page
export const selectCustomersQuery = (state: CustomersRootState) => state.customers.list.query

// ojo: el backend no filtra por texto; la búsqueda se aplica sobre la página que está cargada
export const selectVisibleCustomers = createSelector([selectList], (list) => filterCustomers(list.items, list.query))

export const selectOpenCustomerId = (state: CustomersRootState) => state.customers.selectedId
export const selectHasOpenCustomer = (state: CustomersRootState) => state.customers.selectedId !== null
export const selectCustomerDetail = (state: CustomersRootState) => state.customers.detail
export const selectCustomerDirections = (state: CustomersRootState) => state.customers.directions
export const selectCustomerDiscounts = (state: CustomersRootState) => state.customers.discounts

// encabezado del panel derecho: el nombre del cliente (de la lista mientras llega el detalle) y su documento
export const selectCustomerDrawerMeta = createSelector(
  [selectList, selectOpenCustomerId, selectCustomerDetail],
  (list, openId, detail) => {
    const customer = detail.data?.id === openId ? detail.data : list.items.find((item) => item.id === openId)
    return {
      title: customer?.fullName ?? 'Cliente',
      subtitle: customer?.businessName || customer?.email || undefined,
      tag: customer?.identification || undefined,
    }
  }
)
