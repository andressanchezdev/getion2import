// catalogs.items.thunks · acciones que crean, editan y eliminan un registro de marcas, categorías o modelos y recargan ese catálogo
// conecta con: catalogs.service (llamadas), auth (selectRequestContext) y catalogs.thunks (recarga); las despachan useCatalogItemForm y CatalogTable
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectRequestContext, type AuthState } from '@/features/auth'
import {
  createBrand,
  createCategory,
  createModel,
  deleteBrand,
  deleteCategory,
  deleteModel,
  updateBrand,
  updateCategory,
  updateModel,
} from '../services/catalogs.service'
import type { CatalogItemInput, CatalogsState, CatalogType } from '../types/catalogs.types'
import { fetchBrandsThunk, fetchCategoriesThunk, fetchMotoModelsThunk } from './catalogs.thunks'

type ThunkState = { auth: AuthState; catalogs: CatalogsState }
type ThunkConfig = { state: ThunkState; rejectValue: string }

// recarga el catálogo que acaba de cambiar
const reloadFor = (type: CatalogType) => (type === 'brand' ? fetchBrandsThunk() : type === 'category' ? fetchCategoriesThunk() : fetchMotoModelsThunk())

// crea o edita un registro (con id edita, sin id crea) y recarga el catálogo
export const saveCatalogItemThunk = createAsyncThunk<void, CatalogItemInput, ThunkConfig>(
  'catalogs/saveItem',
  async (input, { dispatch, getState, rejectWithValue }) => {
    const ctx = selectRequestContext(getState())
    if (!ctx) return rejectWithValue('No hay una sesión activa.')
    try {
      const { type, id, name, imageUrl, description, isActive } = input
      if (type === 'brand') {
        const body = { name, imageUrl, ...(isActive !== undefined ? { isActive } : {}) }
        await (id ? updateBrand(id, body) : createBrand(ctx, body))
      } else {
        const body = { name, description, ...(isActive !== undefined ? { isActive } : {}) }
        const update = type === 'category' ? updateCategory : updateModel
        const create = type === 'category' ? createCategory : createModel
        await (id ? update(id, body) : create(ctx, body))
      }
      dispatch(reloadFor(type))
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Error al guardar el registro.'))
    }
  }
)

// elimina un registro y recarga el catálogo
export const deleteCatalogItemThunk = createAsyncThunk<void, { type: CatalogType; id: number }, ThunkConfig>(
  'catalogs/deleteItem',
  async ({ type, id }, { dispatch, rejectWithValue }) => {
    try {
      await (type === 'brand' ? deleteBrand(id) : type === 'category' ? deleteCategory(id) : deleteModel(id))
      dispatch(reloadFor(type))
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Error al eliminar el registro.'))
    }
  }
)
