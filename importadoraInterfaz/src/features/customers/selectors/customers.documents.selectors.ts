// customers.documents.selectors · lecturas de los documentos del cliente abierto y de las alertas de vencimiento de la compañía
// conecta con: CustomerDocumentsSection y CustomersTable (los leen); leen state.customers
import { createSelector } from '@reduxjs/toolkit'
import { worstStatusByCustomer } from '../helpers/customers.documents.adapter'
import type { CustomersState } from '../types/customers.types'

type CustomersRootState = { customers: CustomersState }

// lee los documentos del cliente abierto con su estado de carga
export const selectCustomerDocuments = (state: CustomersRootState) => state.customers.documents
// lee las alertas de documentos vencidos o por vencer
const selectAlertItems = (state: CustomersRootState) => state.customers.documentAlerts.items
// el peor estado de documentos por cliente (para marcar las filas de la tabla)
export const selectDocumentStatusByCustomer = createSelector([selectAlertItems], worstStatusByCustomer)
