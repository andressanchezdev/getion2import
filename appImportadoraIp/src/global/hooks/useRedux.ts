// useRedux · hooks de redux ya tipados (dispatch y selector), para no repetir el tipado en cada componente
// conecta con: app/store/store (solo tipos); los usan app/componentApp y todas las features
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { AppDispatch, RootState } from '@/app/store/store'

// dispatch tipado: acepta thunks y acciones de todos los slices
export const useAppDispatch = () => useDispatch<AppDispatch>()

// selector tipado: state ya sabe qué slices existen (ui, shop, wallet)
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
