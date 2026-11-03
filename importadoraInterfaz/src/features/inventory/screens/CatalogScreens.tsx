// CatalogScreens · Inventario > Marcas, Categorías y Modelos: cada una es la tabla de su catálogo
// conecta con: catalogs (listas, estados y useLoadCatalogs) y CatalogTable; las monta MainContent (screenRegistry)
import React from 'react'
import {
  selectBrands,
  selectBrandsStatus,
  selectCategories,
  selectCategoriesStatus,
  selectMotoModels,
  selectMotoModelsStatus,
  useLoadCatalogs,
} from '@/features/catalogs'
import { useAppSelector } from '@/global/hooks/store/useRedux'
import { CatalogTable } from '../components/table/CatalogTable'

export const BrandsScreen: React.FC = () => {
  useLoadCatalogs()
  const rows = useAppSelector(selectBrands)
  const status = useAppSelector(selectBrandsStatus)
  return (
    <CatalogTable
      type="brand"
      noun="marcas"
      rows={rows}
      loading={status === 'idle' || status === 'loading'}
      failed={status === 'failed'}
      withImage
    />
  )
}

// pantalla de categorías: tabla del catálogo con sus acciones
export const CategoriesScreen: React.FC = () => {
  useLoadCatalogs()
  const rows = useAppSelector(selectCategories)
  const status = useAppSelector(selectCategoriesStatus)
  return (
    <CatalogTable
      type="category"
      noun="categorías"
      rows={rows}
      loading={status === 'idle' || status === 'loading'}
      failed={status === 'failed'}
    />
  )
}

// pantalla de modelos de moto: tabla del catálogo con sus acciones
export const ModelsScreen: React.FC = () => {
  useLoadCatalogs()
  const rows = useAppSelector(selectMotoModels)
  const status = useAppSelector(selectMotoModelsStatus)
  return (
    <CatalogTable
      type="model"
      noun="modelos"
      rows={rows}
      loading={status === 'idle' || status === 'loading'}
      failed={status === 'failed'}
    />
  )
}
