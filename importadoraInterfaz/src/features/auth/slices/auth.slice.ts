// auth.slice · estado de la sesión: usuario, estado (anónimo, ingresando, autenticado) y último error
// conecta con: auth.thunks (login/logout/fetchMe), auth.selectors (lecturas) y AuthGate (decide login o ERP)
import { createSlice } from '@reduxjs/toolkit'
import { toPermissionMatrix } from '../helpers/auth.permissions'
import { getInitialAuthState } from '../helpers/auth.session'
import { fetchCurrentUserThunk, loginThunk, logoutThunk } from '../thunks/auth.thunks'

export const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialAuthState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'authenticating'
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload
        state.permissions = toPermissionMatrix(action.payload)
        state.status = 'authenticated'
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'anonymous'
        state.error = action.payload ?? null
      })
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        state.user = action.payload
        state.permissions = toPermissionMatrix(action.payload)
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null
        state.permissions = null
        state.status = 'anonymous'
        state.error = null
      })
  },
})

export const authReducer = authSlice.reducer
export default authSlice.reducer
