// customers.documents.thunks · documentos del cliente: cargar los de un cliente, cargar las alertas de vencimiento y renovar un documento
// conecta con: customers.documents.service (llamadas) y customers.documents.reducers (reaccionan); los despachan useCustomerDocuments y useDocumentAlerts
// ojo: después de renovar se vuelven a leer la lista del cliente y las alertas (el backend manda); mientras una renovación corre no se acepta otra
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { toast } from '@/global/helpers/feedback/toast'
import { fetchCustomerDocuments, fetchDocumentAlerts, renewCustomerDocument } from '../services/customers.documents.service'
import type { CustomerDocument, CustomerDocumentAlert, CustomersState } from '../types/customers.types'

type ThunkConfig = { state: { customers: CustomersState }; rejectValue: string }

export const loadCustomerDocumentsThunk = createAsyncThunk<CustomerDocument[], number, ThunkConfig>(
  'customers/loadDocuments',
  async (customerId, { rejectWithValue }) => {
    try {
      return await fetchCustomerDocuments(customerId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los documentos.'))
    }
  }
)

export const loadDocumentAlertsThunk = createAsyncThunk<CustomerDocumentAlert[], void, ThunkConfig>(
  'customers/loadDocumentAlerts',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchDocumentAlerts()
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar los documentos por vencer.'))
    }
  }
)

// renueva un documento (con archivo nuevo opcional) y devuelve la lista actualizada del cliente
export const renewDocumentThunk = createAsyncThunk<CustomerDocument[], { customerId: number; documentId: number; file?: File }, ThunkConfig>(
  'customers/renewDocument',
  async ({ customerId, documentId, file }, { dispatch, rejectWithValue }) => {
    try {
      await renewCustomerDocument(customerId, documentId, file)
      const documents = await fetchCustomerDocuments(customerId)
      dispatch(loadDocumentAlertsThunk())
      toast.success('Documento renovado')
      return documents
    } catch (error) {
      const message = getErrorMessage(error, 'No se pudo renovar el documento.')
      toast.error(message)
      return rejectWithValue(message)
    }
  },
  { condition: (_, { getState }) => !getState().customers.documents.saving }
)
