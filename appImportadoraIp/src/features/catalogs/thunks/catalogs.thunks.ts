// catalogs.thunks · acciones que cargan cada catálogo (marcas, categorías y modelos) con el contexto de la sesión
// conecta con: catalogs.service (llamadas), auth (selectRequestContext) y catalogs.slice (reacciona a pending, fulfilled y rejected); las despacha useLoadCatalogs
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState, type RequestContext } from '@/features/auth'
import { fetchBrands, fetchCategories, fetchMotoModels } from '../services/catalogs.service'
import type { CatalogResource, CatalogsState } from '../types/catalogs.types'

// forma mínima del state que necesitan estos thunks (la feature no importa el store de app)
type ThunkState = { auth: AuthState; catalogs: CatalogsState }

// los tres catálogos se cargan igual (contexto → service → lista); solo cambia el service, por eso se crean con una sola función
// ojo: la condición evita pedir otra vez un catálogo que ya se está cargando (en desarrollo, React StrictMode ejecuta los efectos dos veces)
const createCatalogThunk = <T>(
  type: string,
  key: keyof CatalogsState,
  fetcher: (ctx: RequestContext) => Promise<T[]>
) =>
  createAsyncThunk<T[], void, { state: ThunkState; rejectValue: string }>(
    type,
    async (_, { getState, rejectWithValue }) => {
      const ctx = selectRequestContext(getState())
      if (!ctx) return rejectWithValue('No hay una sesión activa.')
      try {
        return await fetcher(ctx)
      } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'No se pudo cargar el catálogo.'))
      }
    },
    {
      condition: (_, { getState }) => (getState().catalogs[key] as CatalogResource<unknown>).status !== 'loading',
    }
  )

export const fetchBrandsThunk = createCatalogThunk('catalogs/brands', 'brands', fetchBrands)
export const fetchCategoriesThunk = createCatalogThunk('catalogs/categories', 'categories', fetchCategories)
export const fetchMotoModelsThunk = createCatalogThunk('catalogs/models', 'models', fetchMotoModels)
