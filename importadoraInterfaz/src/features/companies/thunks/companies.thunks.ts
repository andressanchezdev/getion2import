// companies.thunks · carga las compañías registradas (GET /companies) para el selector del header y la pantalla de compañías del superadmin
// conecta con: companies.service (llamada) y companies.slice (reacciona); las despacha useCompanies
// ojo: solo el superadmin ve todas las compañías; los demás niveles no despachan este thunk
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { fetchCompanies } from '../services/companies.service'
import type { Company } from '../types/companies.types'

export const loadCompaniesThunk = createAsyncThunk<Company[], void, { rejectValue: string }>('companies/load', async (_, { rejectWithValue }) => {
  try {
    return await fetchCompanies()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudieron cargar las compañías.'))
  }
})
