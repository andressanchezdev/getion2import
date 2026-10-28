// store · configura redux + persistencia y exporta los tipos RootState y AppDispatch
// conecta con: rootReducer, global/helpers/storage; ojo: antes se llamaba store.tsx (no tenía JSX)
import { configureStore, type UnknownAction } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from '@/global/helpers/storage'
import { setUnauthorizedHandler } from '@/api'
import { logoutThunk, selectIsAuthenticated } from '@/features/auth'

import { rootReducer } from './rootReducer'

// ============================================================================
// 1. CONFIGURACIÓN DEL STORE & PERSISTENCIA
// ============================================================================
const persistConfig = {
  key: 'ip_online_pruebas_v6', // v6: cartera salió del estado guardado (viene del backend); v5: el carrito salió del estado guardado (ahora viene del backend; solo se guardan su uuid y los niveles de precio); v4: los filtros del catálogo pasaron a ids y la lista de productos salió del estado guardado (ahora viene del backend); v3: las bodegas ya vienen del backend (ids numéricos) y el stock de los productos de ejemplo cambió; v2: cambiaron los ids a inglés (módulos y estados). Se sube la clave para no cargar datos viejos
  storage,
  whitelist: ['ui', 'shop'], // ojo: wallet ya no se guarda (su estado viene del backend) //afuturo aqui las demas 
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)

// ojo: si el backend responde 401 (token vencido) se cierra la sesión; la alerta "Tu sesión expiró" la muestra logoutThunk (antes se mostraba aquí)
setUnauthorizedHandler(() => {
  if (selectIsAuthenticated(store.getState())) {
    store.dispatch(logoutThunk('expired') as unknown as UnknownAction)
  }
})

// ============================================================================
// 2. TIPOS DEL STORE (los hooks tipados están en global/hooks/useRedux.ts)
// ============================================================================

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// ojo: useAppDispatch y useAppSelector ahora viven en global/hooks/useRedux.ts

// ============================================================================
// 3. RE-EXPORTACIONES PARA MANTENER RETROCOMPATIBILIDAD LIMPIA
// ============================================================================

//export * from './types/ui.types'
//export * from './constants/ui.constants'
//export * from './slices/ui.slice'
export default store
