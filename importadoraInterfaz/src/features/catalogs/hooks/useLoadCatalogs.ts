// useLoadCatalogs · pide las marcas, categorías y modelos al backend la primera vez que una pantalla los necesita
// conecta con: ShopCatalogScreen (la usa al montarse); despacha catalogs.thunks y lee el estado de catalogs.selectors
// ojo: solo pide los que están en "idle"; si uno falla NO se reintenta solo (así no se repite en bucle con el servidor caído); recargar la página lo vuelve a intentar
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/global/hooks/useRedux'
import { selectBrandsStatus, selectCategoriesStatus, selectMotoModelsStatus } from '../selectors/catalogs.selectors'
import { fetchBrandsThunk, fetchCategoriesThunk, fetchMotoModelsThunk } from '../thunks/catalogs.thunks'

export const useLoadCatalogs = (): void => {
  const dispatch = useAppDispatch()
  const brandsStatus = useAppSelector(selectBrandsStatus)
  const categoriesStatus = useAppSelector(selectCategoriesStatus)
  const modelsStatus = useAppSelector(selectMotoModelsStatus)

  useEffect(() => {
    if (brandsStatus === 'idle') dispatch(fetchBrandsThunk())
    if (categoriesStatus === 'idle') dispatch(fetchCategoriesThunk())
    if (modelsStatus === 'idle') dispatch(fetchMotoModelsThunk())
  }, [dispatch, brandsStatus, categoriesStatus, modelsStatus])
}
