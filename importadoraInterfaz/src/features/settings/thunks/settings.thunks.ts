// settings.thunks · carga y guarda la ficha de la empresa, la cuenta del usuario en sesión y la imagen del protector de pantalla
// conecta con: settings.service (llamadas), auth (selectRequestContext y selectCurrentUser) y settings.slice (reacciona); las despachan useCompanyForm, useSecurityForm y useScreensaverSettings
// ojo: si el backend rechaza el guardado se avisa con su mensaje; nunca se dice «guardado» cuando no lo está
import { createAsyncThunk } from '@reduxjs/toolkit'
import { getErrorMessage } from '@/api'
import { selectCurrentUser, selectRequestContext, setCurrentUser, type AuthState } from '@/features/auth'
import { toast } from '@/global/helpers/feedback/toast'
import { fetchCompany, fetchScreensaver, saveScreensaver, updateCompany, updatePassword, updateProfile } from '../services/settings.service'
import type { CompanyInput, CompanyProfile, ProfileInput } from '../types/settings.types'

type Config = { state: { auth: AuthState; ui?: { activeCompanyId?: number } }; rejectValue: string }

const SCREENSAVER_CACHE_KEY = 'custom_screensaver_logo' // lo lee el protector para dibujar sin esperar al backend

const cacheScreensaver = (imageUrl: string) => {
  try {
    if (imageUrl) localStorage.setItem(SCREENSAVER_CACHE_KEY, imageUrl)
    else localStorage.removeItem(SCREENSAVER_CACHE_KEY)
  } catch {
    // ojo: almacenamiento lleno o bloqueado; el backend ya la guardó
  }
}

export const loadCompanyThunk = createAsyncThunk<CompanyProfile, void, Config>('settings/loadCompany', async (_, { getState, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue('No hay una sesión activa.')
  try {
    return await fetchCompany(ctx.companyId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar la información de la empresa.'))
  }
})

export const saveCompanyThunk = createAsyncThunk<CompanyProfile, CompanyInput, Config>('settings/saveCompany', async (input, { getState, rejectWithValue }) => {
  const ctx = selectRequestContext(getState())
  if (!ctx) return rejectWithValue('No hay una sesión activa.')
  try {
    const saved = await updateCompany(ctx.companyId, input)
    toast.success('¡Información de la empresa actualizada con éxito!')
    return saved
  } catch (error) {
    const message = getErrorMessage(error, 'No se pudo guardar la información de la empresa.')
    toast.error(message)
    return rejectWithValue(message)
  }
})

export const saveAccountThunk = createAsyncThunk<void, ProfileInput & { currentPassword?: string; password: string }, Config>('settings/saveAccount', async ({ currentPassword, password, ...profile }, { getState, dispatch, rejectWithValue }) => {
  const user = selectCurrentUser(getState())
  if (!user) return rejectWithValue('No hay una sesión activa.')
  try {
    const updatedUser = await updateProfile(profile)
    if (password) await updatePassword(currentPassword ?? '', password)
    dispatch(setCurrentUser(updatedUser))
    toast.success('¡Perfil y credenciales actualizadas con éxito!')
  } catch (error) {
    const message = getErrorMessage(error, 'No se pudieron guardar los cambios de la cuenta.')
    toast.error(message)
    return rejectWithValue(message)
  }
})

export const loadScreensaverThunk = createAsyncThunk<string, void, Config>('settings/loadScreensaver', async (_, { rejectWithValue }) => {
  try {
    const settings = await fetchScreensaver()
    const imageUrl = settings?.isActive ? settings.imageUrl : ''
    cacheScreensaver(imageUrl)
    return imageUrl
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'No se pudo cargar la imagen del protector.'))
  }
})

export const saveScreensaverThunk = createAsyncThunk<string, string, Config>('settings/saveScreensaver', async (imageUrl, { rejectWithValue }) => {
  try {
    await saveScreensaver(imageUrl)
    cacheScreensaver(imageUrl)
    toast.success('Imagen del protector guardada')
    return imageUrl
  } catch (error) {
    const message = getErrorMessage(error, 'Error al guardar la configuración del protector')
    toast.error(message)
    return rejectWithValue(message)
  }
})
