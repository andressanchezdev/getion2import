// customers.documents.reducers · cómo reacciona el estado de clientes a la carga y renovación de documentos y a las alertas de vencimiento
// conecta con: customers.slice (los agrega al builder) y customers.documents.thunks (las acciones que escuchan)
// ojo: los documentos son de UN cliente (el abierto); al abrir otro cliente el slice los limpia
import type { ActionReducerMapBuilder } from '@reduxjs/toolkit'
import { loadCustomerDocumentsThunk, loadDocumentAlertsThunk, renewDocumentThunk } from '../thunks/customers.documents.thunks'
import type { CustomersState } from '../types/customers.types'

// agrega al builder los casos de documentos y alertas
export const addDocumentCases = (builder: ActionReducerMapBuilder<CustomersState>) => {
  builder
    .addCase(loadCustomerDocumentsThunk.pending, (state) => {
      state.documents.status = 'loading'
      state.documents.error = null
    })
    .addCase(loadCustomerDocumentsThunk.fulfilled, (state, action) => {
      state.documents.items = action.payload
      state.documents.status = 'succeeded'
    })
    .addCase(loadCustomerDocumentsThunk.rejected, (state, action) => {
      state.documents.status = 'failed'
      state.documents.error = action.payload ?? 'No se pudieron cargar los documentos.'
    })
    .addCase(renewDocumentThunk.pending, (state) => {
      state.documents.saving = true
    })
    .addCase(renewDocumentThunk.fulfilled, (state, action) => {
      state.documents.saving = false
      state.documents.items = action.payload
      state.documents.status = 'succeeded'
    })
    .addCase(renewDocumentThunk.rejected, (state) => {
      state.documents.saving = false
    })
    .addCase(loadDocumentAlertsThunk.pending, (state) => {
      state.documentAlerts.status = 'loading'
      state.documentAlerts.error = null
    })
    .addCase(loadDocumentAlertsThunk.fulfilled, (state, action) => {
      state.documentAlerts.items = action.payload
      state.documentAlerts.status = 'succeeded'
    })
    .addCase(loadDocumentAlertsThunk.rejected, (state, action) => {
      state.documentAlerts.status = 'failed'
      state.documentAlerts.error = action.payload ?? 'No se pudieron cargar los documentos por vencer.'
    })
}
