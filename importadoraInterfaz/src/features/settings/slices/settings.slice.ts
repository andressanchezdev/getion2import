// settings.slice · estado de la configuración (clave 'settings'): ficha de la empresa e imagen del protector con sus banderas de carga y guardado
// conecta con: settings.thunks (la llenan), settings.selectors (lecturas) y rootReducer (clave 'settings'; NO se guarda en el navegador)
import { createSlice } from '@reduxjs/toolkit'
import { logoutThunk } from '@/features/auth'
import { INITIAL_SETTINGS_STATE } from '../constants/settings.constants'
import { loadCompanyThunk, loadScreensaverThunk, saveCompanyThunk, saveScreensaverThunk } from '../thunks/settings.thunks'

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: INITIAL_SETTINGS_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCompanyThunk.pending, (state) => { state.companyLoading = true })
      .addCase(loadCompanyThunk.fulfilled, (state, action) => { state.companyLoading = false; state.company = action.payload })
      .addCase(loadCompanyThunk.rejected, (state) => { state.companyLoading = false })
      .addCase(saveCompanyThunk.pending, (state) => { state.companySaving = true })
      .addCase(saveCompanyThunk.fulfilled, (state, action) => { state.companySaving = false; state.company = action.payload })
      .addCase(saveCompanyThunk.rejected, (state) => { state.companySaving = false })
      .addCase(loadScreensaverThunk.pending, (state) => { state.screensaverLoading = true })
      .addCase(loadScreensaverThunk.fulfilled, (state, action) => { state.screensaverLoading = false; state.screensaverImage = action.payload })
      .addCase(loadScreensaverThunk.rejected, (state) => { state.screensaverLoading = false })
      .addCase(saveScreensaverThunk.pending, (state) => { state.screensaverSaving = true })
      .addCase(saveScreensaverThunk.fulfilled, (state, action) => { state.screensaverSaving = false; state.screensaverImage = action.payload })
      .addCase(saveScreensaverThunk.rejected, (state) => { state.screensaverSaving = false })
      .addCase(logoutThunk.fulfilled, () => INITIAL_SETTINGS_STATE)
  },
})

export const settingsReducer = settingsSlice.reducer
